const jwt = require("jsonwebtoken");
const User = require("../models/User/User");

const verifyToken = async (req, res, next) => {
  const token = req.headers["authorization"];

  // Si no hay token, devuelve error
  if (!token) {
    return res.status(400).json({ message: "No hay una sesión activa." });
  }

  try {
    // Verificar y decodificar el token
    const userSession = jwt.verify(token, process.env.SECRET_JWT_KEY);

    // Buscar el usuario en la base de datos
    const user = await User.findOne({ _id: userSession.id });

    // Si el usuario no existe, devuelve error
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // Adjuntar el usuario al objeto req para su uso en rutas posteriores
    req.user = user;

    // Continuar con el siguiente middleware o controlador
    next();
  } catch (error) {
    console.error("Error verificando token:", error);

    // Manejar errores específicos de JWT
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Token no válido." });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "La sesión ha expirado." });
    }

    // Error genérico del servidor
    return res
      .status(500)
      .json({ message: "Error interno del servidor al verificar el token." });
  }
};

const isAdmin = async (req, res, next) => {
  // Si el usuario no está autenticado, devuelve error
  if (!req.user) {
    return res.status(401).json({ message: "No estás autenticado." });
  }

  // Si el usuario no es admin, devuelve error
  if (["superadmin", "admin"].indexOf(req.user.rol) === -1) {
    return res.status(403).json({ message: "No tienes permisos para acceder a esta ruta." });
  }

  // Continuar con el siguiente middleware o controlador
  next();
};

module.exports = { verifyToken, isAdmin };
