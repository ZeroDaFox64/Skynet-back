const User = require("../models/User");
const bcrypt = require("bcrypt");
const { str10_36 } = require("hyperdyperid/lib/str10_36");
const { paginate } = require("../config/utils");
const { Op } = require('sequelize');

/**
 * Registrar un nuevo usuario
 */
const registerUser = async (req, res) => {
  const { email, password, name, role, company_id } = req.body;

  // 1. Validar campos obligatorios
  if (!email) {
    return res.status(400).json({
      message: "Datos incompletos: falta el correo electrónico",
    });
  }

  // Contraseña por defecto si no se envía
  const userPassword = password || "Usuario.01";

  // 2. Validar formato de correo electrónico
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      message: "Formato de correo electrónico inválido" 
    });
  }

  try {
    // 3. Verificar si el usuario ya existe
    const existingUser = await User.findOne({ 
      where: { email: email.toLowerCase() } 
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: "El correo electrónico ya está registrado" 
      });
    }

    // 4. Hashear la contraseña
    const saltRounds = 10;
    const hash = await bcrypt.hash(userPassword, saltRounds);

    // 5. Crear el usuario
    const newUser = await User.create({
      email: email.toLowerCase(),
      password: hash,
      role: role || 'user',
      name: name || null,
      company_id: company_id || 2,
    });

    // 6. Respuesta exitosa (excluyendo el password por seguridad)
    const { password: _, ...userResponse } = newUser.toJSON();

    return res.status(201).json({
      user: userResponse,
    });

  } catch (err) {
    // Manejo de errores específicos de Sequelize (Constraint violations, etc.)
    if (err.name === "SequelizeValidationError" || err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ 
        message: "Error de validación: " + err.errors.map(e => e.message).join(", ") 
      });
    }
    
    console.error("Error en registerUser:", err);
    return res.status(500).json({ 
      message: "Error interno del servidor al registrar el usuario" 
    });
  }
};

/**
 * Obtener todos los usuarios
 */
const getAllUsers = async (req, res) => {
  try {
    // Obtener todos los usuarios
    const users = await User.findAll();

    // Verificar si se encontraron usuarios
    if (users.length === 0) {
      return res.status(404).json({ message: "No se encontraron usuarios." });
    }

    // Respuesta exitosa
    return res.status(200).json({
      message: "Usuarios obtenidos con éxito",
      users,
    });
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);

    // Manejar errores específicos
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Error en la solicitud." });
    }

    // Error genérico del servidor
    return res
      .status(500)
      .json({ message: "Error interno del servidor al obtener los usuarios." });
  }
};

/**
 * Obtener usuarios con paginación y filtros
 */
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, filters, role } = req.query;

    // 1. Convertir a números para evitar errores en el cálculo
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // 2. Construir el objeto de filtrado (where)
    const where = {};

    if (role) {
      where.role = role;
    }

    if (filters) {
      // Usamos [Op.or] y [Op.iLike] para búsqueda parcial e insensible a mayúsculas
      where[Op.or] = [
        { name: { [Op.iLike]: `%${filters}%` } },
        { email: { [Op.iLike]: `%${filters}%` } }
      ];
    }

    // 3. Consultar usando findAndCountAll (devuelve filas y el total)
    const { count, rows } = await User.findAndCountAll({
      where,
      limit: limitNum,
      offset: offset,
      order: [['createdAt', 'DESC']], // 'createdAt' es el estándar de Sequelize
    });

    // 4. Calcular metadata de paginación
    const totalPages = Math.ceil(count / limitNum);

    return res.status(200).json({
      users: rows,
      pagination: {
        totalUsers: count,
        totalPages: totalPages,
        currentPage: pageNum,
        limit: limitNum,
      },
    });

  } catch (error) {
    console.error("Error obteniendo usuarios:", error);

    if (error.name === 'SequelizeDatabaseError') {
      return res.status(400).json({ message: "Error en la consulta a la base de datos." });
    }

    return res.status(500).json({ 
      message: "Error interno del servidor al obtener los usuarios." 
    });
  }
};

/**
 * Obtener un usuario por ID
 */
const getUser = async (req, res) => {
  const { id } = req.params;

  // 1. Validar que el ID esté presente
  if (!id) {
    return res
      .status(400)
      .json({ message: "Se requiere un ID para obtener el usuario." });
  }

  try {
    // 2. Buscar el usuario por su Clave Primaria (ID)
    // findByPk es más limpio que findOne({ where: { id } })
    const user = await User.findByPk(id);

    // 3. Verificar si el usuario fue encontrado
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // 4. Seleccionar los campos para la respuesta
    const userResponse = {
      id: user.id,
      email: user.email,
      role: user.role || null, 
      name: user.name || null,
      company_id: user.company_id || null,
    };

    return res.status(200).json({ user: userResponse });

  } catch (error) {
    console.error("Error obteniendo usuario:", error);

    // 5. Manejar errores de formato de ID
    // En Postgres/Sequelize, si el ID no es del tipo correcto (ej. esperas un número y mandas texto)
    // se lanza un DatabaseError con el código de error de sintaxis.
    if (error.name === "SequelizeDatabaseError" || error.name === "SequelizeHostNotReachableError") {
      return res.status(400).json({ message: "ID de usuario no válido o error de base de datos." });
    }

    return res
      .status(500)
      .json({ message: "Error interno del servidor al obtener el usuario." });
  }
};

/**
 * Actualizar un usuario por ID
 */
const updateUser = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "No se ha encontrado un ID" });
  }

  const allowedFields = ["email", "name", "role", "company_id"];

  const userData = allowedFields.reduce((acc, field) => {
    if (req.body[field] !== undefined) {
      acc[field] = req.body[field];
    }
    return acc;
  }, {});

  // Si se actualiza la contraseña, hashearla
  if (req.body.password) {
    const saltRounds = 10;
    userData.password = await bcrypt.hash(req.body.password, saltRounds);
  }

  try {
    // 1. Buscar si el usuario existe
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // 2. Actualizar la instancia
    await user.update(userData);

    // 3. Respuesta con los datos actualizados
    const userResponse = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      company_id: user.company_id,
    };

    return res.status(200).json({
      message: "Usuario actualizado con éxito",
      user: userResponse,
    });

  } catch (error) {
    console.error("Error actualizando usuario:", error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: "El email ya está en uso." });
    }
    
    return res.status(500).json({ message: "Error interno al actualizar usuario." });
  }
};

/**
 * Borrar un usuario por ID
 */
const deleteUser = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Se requiere un ID para eliminar el usuario." });
  }

  try {
    // Ejecutar la eliminación
    const deletedRows = await User.destroy({
      where: { id: id }
    });

    // Si deletedRows es 0, significa que no se encontró el ID
    if (deletedRows === 0) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    return res.status(200).json({
      message: "Usuario eliminado con éxito",
      deletedUserId: id,
    });

  } catch (error) {
    console.error("Error eliminando usuario:", error);

    // Error de sintaxis en el ID (ej. mandar texto cuando es un INTEGER)
    if (error.name === "SequelizeDatabaseError") {
      return res.status(400).json({ message: "ID de usuario no válido." });
    }

    return res.status(500).json({ 
      message: "Error interno del servidor al eliminar el usuario." 
    });
  }
};



module.exports = {
  registerUser,
  getAllUsers,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};
