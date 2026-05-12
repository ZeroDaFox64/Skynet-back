const jwt = require("jsonwebtoken");
const User = require("../models/User");

const verifyToken = async (req, res, next) => {
  // 1. Obtener el token del header
  let token = req.headers["authorization"];

  if (!token) {
    return res.status(401).json({ message: "No hay una sesión activa." });
  }

  // 2. Limpiar el token si viene con el prefijo "Bearer "
  if (token.startsWith("Bearer ")) {
    token = token.slice(7, token.length);
  }

  try {
    // 3. Verificar y decodificar el token
    const userSession = jwt.verify(token, process.env.SECRET_JWT_KEY);

    // 4. Buscar el usuario en Postgres usando Sequelize
    // Cambiamos _id por id y usamos el objeto { where }
    const user = await User.findOne({ 
      where: { id: userSession.id } 
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // 5. Adjuntar el usuario (instancia de Sequelize) al objeto req
    req.user = user;
    next();

  } catch (error) {
    console.error("Error verificando token:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Token no válido." });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "La sesión ha expirado." });
    }

    return res.status(500).json({ 
      message: "Error interno del servidor al verificar el token." 
    });
  }
};

const isAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "No estás autenticado." });
  }

  // IMPORTANTE: En tu modelo de Sequelize pusiste "rol", 
  // así que aquí usamos req.user.rol (no role)
  const allowedRoles = ["superadmin", "admin"];
  
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      message: "Acceso denegado: Se requieren permisos de administrador." 
    });
  }

  next();
};

module.exports = { verifyToken, isAdmin };