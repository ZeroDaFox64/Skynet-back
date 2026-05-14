const express = require("express");
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
app.use(cors(
  {
    origin: ["http://localhost:5173", "https://japan-gallery.onrender.com"],
    credentials: true
  }
));
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

app.use("/api/v1", authRoutes);
app.use("/api/v1", userRoutes);
app.use("/api/v1", companyRoutes);

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Server start
app.listen(PORT, () => {
  console.log(`Server run on PORT ${PORT}`.cyan);
});