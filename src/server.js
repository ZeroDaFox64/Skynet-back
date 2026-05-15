const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");
const { connectDB } = require("./config/db");
const fileUpload = require("express-fileupload")
const path = require("path");
require("dotenv").config();
require('colors');

// Inicializations
const app = express();
const PORT = process.env.PORT || 4000;

// HTTP Server & WebSockets
const server = http.createServer(app);
const corsOptions = {
  origin: function (origin, callback) {
    // Permite cualquier origen dinámicamente, ideal para producción donde la URL del frontend puede variar
    callback(null, true);
  },
  credentials: true,
};

const io = new Server(server, {
  cors: corsOptions,
});

// Guardar la instancia de socket.io para usarla en los controladores (ej. req.app.get("io"))
app.set("io", io);

// Estado global en memoria para las mesas
const activeMesas = {};

io.on("connection", (socket) => {
  console.log(`WebSocket: User connected (${socket.id})`.cyan);

  // Manejar el ingreso a una "mesa" (sala/room)
  socket.on("join_mesa", (data) => {
    const mesaId = typeof data === 'string' ? data : data.mesaId;
    const username = typeof data === 'string' ? 'Anónimo' : (data.username || 'Anónimo');
    const localConsumptions = data.localConsumptions || [];
    const isClosed = data.isClosed || false;

    socket.join(mesaId);
    
    // Inicializar la mesa en memoria si no existe
    if (!activeMesas[mesaId]) {
      activeMesas[mesaId] = { users: [], consumptions: localConsumptions, splitRequests: [], isClosed: isClosed };
    } else {
      if (localConsumptions.length > activeMesas[mesaId].consumptions.length) {
        // Rehidratar si el cliente tiene más consumos guardados localmente (ej. caída del server)
        activeMesas[mesaId].consumptions = localConsumptions;
      }
      if (!activeMesas[mesaId].splitRequests) {
        activeMesas[mesaId].splitRequests = [];
      }
      if (activeMesas[mesaId].isClosed === undefined || isClosed) {
        activeMesas[mesaId].isClosed = activeMesas[mesaId].isClosed || isClosed;
      }
    }
    
    // Añadir usuario si no está en la lista
    if (!activeMesas[mesaId].users.find(u => u.id === socket.id)) {
      activeMesas[mesaId].users.push({ id: socket.id, username });
    }
    
    // Guardar referencia en el socket para limpiar en disconnect
    socket.mesaId = mesaId;

    console.log(`Socket ${socket.id} (${username}) joined mesa: ${mesaId}`.green);
    
    // Enviar el estado actualizado de la mesa a TODOS en la sala
    io.to(mesaId).emit("room_state_update", activeMesas[mesaId]);
  });

  // Escuchar cuando se añade un consumo
  socket.on("ADD_ITEM", (payload) => {
    const { mesaId, item } = payload;
    if (activeMesas[mesaId]) {
      
      // 1. Verificar si el mismo usuario ya pidió este mismo producto
      const existingConsumption = activeMesas[mesaId].consumptions.find(
        c => c.productId === item.productId && c.username === item.username
      );

      if (existingConsumption) {
        // 2. Si existe, simplemente sumar la nueva cantidad
        existingConsumption.quantity = (existingConsumption.quantity || 1) + (item.quantity || 1);
      } else {
        // 3. Si no existe, crear uno nuevo
        const consumoId = Date.now().toString(36) + Math.random().toString(36).substring(2);
        const newConsumption = { ...item, id: consumoId };
        activeMesas[mesaId].consumptions.push(newConsumption);
      }
      
      // Emitir el estado actualizado a toda la sala
      io.to(mesaId).emit("room_state_update", activeMesas[mesaId]);
    }
  });

  // Escuchar cuando se elimina un consumo
  socket.on("DELETE_ITEM", (payload) => {
    const { mesaId, consumoId } = payload;
    if (activeMesas[mesaId]) {
      activeMesas[mesaId].consumptions = activeMesas[mesaId].consumptions.filter(c => c.id !== consumoId);
      io.to(mesaId).emit("room_state_update", activeMesas[mesaId]);
    }
  });

  // Escuchar cuando se actualiza la cantidad de un consumo
  socket.on("UPDATE_QUANTITY", (payload) => {
    const { mesaId, consumoId, newQuantity } = payload;
    if (activeMesas[mesaId]) {
      const consumption = activeMesas[mesaId].consumptions.find(c => c.id === consumoId);
      if (consumption && newQuantity > 0) {
        consumption.quantity = newQuantity;
        io.to(mesaId).emit("room_state_update", activeMesas[mesaId]);
      }
    }
  });

  // Solicitar compartir cuenta
  socket.on("REQUEST_SPLIT", (payload) => {
    const { mesaId, consumoId, amount, requesterUsername } = payload;
    if (activeMesas[mesaId]) {
      const consumption = activeMesas[mesaId].consumptions.find(c => c.id === consumoId);
      if (consumption) {
        const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
        if (!activeMesas[mesaId].splitRequests) activeMesas[mesaId].splitRequests = [];
        
        activeMesas[mesaId].splitRequests.push({
          id: requestId,
          consumoId,
          requesterUsername,
          ownerUsername: consumption.username,
          amount,
          consumptionName: consumption.name,
          totalPrice: consumption.price * consumption.quantity
        });
        io.to(mesaId).emit("room_state_update", activeMesas[mesaId]);
      }
    }
  });

  // Responder a solicitud de compartir
  socket.on("RESPOND_SPLIT", (payload) => {
    const { mesaId, requestId, accepted } = payload;
    if (activeMesas[mesaId] && activeMesas[mesaId].splitRequests) {
      const requestIndex = activeMesas[mesaId].splitRequests.findIndex(r => r.id === requestId);
      if (requestIndex !== -1) {
        const request = activeMesas[mesaId].splitRequests[requestIndex];
        
        if (accepted) {
          const consumption = activeMesas[mesaId].consumptions.find(c => c.id === request.consumoId);
          if (consumption) {
            if (!consumption.splits) consumption.splits = [];
            
            const currentTotal = consumption.splits.reduce((acc, s) => acc + s.amount, 0);
            let finalAmount = request.amount;
            const itemTotal = consumption.price * consumption.quantity;
            
            // Validar que no exceda el total
            if (currentTotal + finalAmount > itemTotal) {
              finalAmount = itemTotal - currentTotal;
            }

            if (finalAmount > 0) {
              // Verificar si el usuario ya tiene un split y actualizarlo, o agregarlo nuevo
              const existingSplit = consumption.splits.find(s => s.username === request.requesterUsername);
              if (existingSplit) {
                existingSplit.amount += finalAmount;
              } else {
                consumption.splits.push({
                  username: request.requesterUsername,
                  amount: finalAmount
                });
              }
            }
          }
        }
        
        // Eliminar la solicitud
        activeMesas[mesaId].splitRequests.splice(requestIndex, 1);
        io.to(mesaId).emit("room_state_update", activeMesas[mesaId]);
      }
    }
  });

  // Cerrar mesa
  socket.on("CLOSE_MESA", (payload) => {
    const { mesaId } = payload;
    if (activeMesas[mesaId]) {
      activeMesas[mesaId].isClosed = true;
      io.to(mesaId).emit("room_state_update", activeMesas[mesaId]);
    }
  });

  socket.on("disconnect", () => {
    console.log(`WebSocket: User disconnected (${socket.id})`.red);
    const mesaId = socket.mesaId;
    
    if (mesaId && activeMesas[mesaId]) {
      // Eliminar al usuario de la lista
      activeMesas[mesaId].users = activeMesas[mesaId].users.filter(u => u.id !== socket.id);
      
      // Avisar al resto de la mesa que alguien salió
      io.to(mesaId).emit("room_state_update", activeMesas[mesaId]);
    }
  });
});

  // El contenido fue reemplazado arriba

// Connect to DB
connectDB();

// Rate Limit
const limiter = rateLimit({
  windowMs: 5 * 1000, // 5 segundos
  max: 100, // Límite de 100 peticiones por ventana
  message: "Has excedido el límite de peticiones.",
  headers: true, // Incluir encabezados HTTP con información del límite
});

// Middlewares
app.use(limiter);
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());
app.use(
  fileUpload({
    tempFileDir: "/temp",
  })
);

// Routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const companyRoutes = require("./routes/company.routes");
const productRoutes = require("./routes/product.routes");

app.use("/api/v1", authRoutes);
app.use("/api/v1", userRoutes);
app.use("/api/v1", companyRoutes);
app.use("/api/v1", productRoutes);

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Server start
server.listen(PORT, () => {
  console.log(`Server run on PORT ${PORT}`.cyan);
});