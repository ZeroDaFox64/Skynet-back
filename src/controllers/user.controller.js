const User = require("../models/User/User");
const bcrypt = require("bcrypt");
const { str10_36 } = require("hyperdyperid/lib/str10_36");
const { paginate } = require("../config/utils");

/**
 * Registrar un nuevo usuario
 */
const registerUser = async (req, res) => {
  const { email, username, password, name, lastname, phone, rol, observations } = req.body;

  // Validar campos obligatorios
  if (!username || !email) {
    return res.status(400).json({
      message: "Datos incompletos: username y email son obligatorios",
    });
  }

  // Validar formato de correo electrónico
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json({ message: "Formato de correo electrónico inválido" });
  }

  let hash;
  if (password) hash = await bcrypt.hash(password, 10);

  try {
    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "El correo electrónico ya está registrado" });
    }

    const newUser = new User({
      username,
      email: email.toLowerCase(),
      password: password ? hash : 'contraseña',
      rol: rol ? rol : 'user',
      name: name || null,
      lastname: lastname || null,
      phone: phone || null,
      observations: observations || null,
    });

    await newUser.save();

    return res.status(200).json({
      user: {
        ...newUser,
      },
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Error de validación: " + err.message });
    }
    return res
      .status(500)
      .json({ message: "Error interno del servidor al registrar el usuario" });
  }
};

/**
 * Obtener todos los usuarios
 */
const getAllUsers = async (req, res) => {
  try {
    // Obtener todos los usuarios
    const users = await User.find();

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
    const { page = 1, limit = 20, filters, rol } = req.query;

    // Construir el objeto de filtrado
    const filterQuery = {};

    if (rol) {
      filterQuery.rol = rol;
    }

    if (filters) {
      // Crear un array con las propiedades del modelo User que deseas buscar
      const searchableFields = [
        "name",
        "email",
        "username",
        "phone",
        "lastname",
      ];

      // Crear un array de condiciones de búsqueda para cada campo
      const searchConditions = searchableFields.map((field) => ({
        [field]: { $regex: filters, $options: "i" },
      }));

      // Combinar las condiciones con el operador $or
      filterQuery.$or = searchConditions;
    }

    const paginateOptions = {
      page,
      limit,
      sortBy: "created_at",
      sortOrder: "desc",
    };

    // Usar la función paginate para obtener los usuarios
    const result = await paginate(User, filterQuery, paginateOptions);

    // Respuesta exitosa
    return res.status(200).json({
      users: result.docs,
      pagination: {
        totalUsers: result.totalDocs,
        totalPages: result.totalPages,
        currentPage: result.page,
        limit: result.limit,
      },
    });
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);

    // Manejar errores específicos
    if (error.message === "Parámetros de paginación no válidos.") {
      return res.status(400).json({ message: error.message });
    }

    // Error genérico del servidor
    return res
      .status(500)
      .json({ message: "Error interno del servidor al obtener los usuarios." });
  }
};

/**
 * Obtener un usuario por ID
 */
const getUser = async (req, res) => {
  const { id } = req.params;

  // Validar que el ID esté presente
  if (!id) {
    return res
      .status(400)
      .json({ message: "Se requiere un ID para obtener el usuario." });
  }

  try {
    // Buscar el usuario por ID
    const user = await User.findOne({ _id: id });

    // Verificar si el usuario fue encontrado
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // Seleccionar los campos que se devolverán en la respuesta
    const userResponse = {
      id: user._id,
      email: user.email,
      username: user.username,
      rol: user.rol || null,
      name: user.name || null,
      lastname: user.lastname || null,
      phone: user.phone || null,
      shipping_address: user.shipping_address || null,
      shipping_service: user.shipping_service || null,
      avatar: user.avatar || null,
      observations: user.observations || null,
      created_at: user.created_at,
    };

    // Respuesta exitosa
    return res.status(200).json({ user: userResponse });
  } catch (error) {
    console.error("Error obteniendo usuario:", error);

    // Manejar errores específicos
    if (error.name === "CastError") {
      return res.status(400).json({ message: "ID de usuario no válido." });
    }

    // Error genérico del servidor
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

  const allowedFields = [
    "email",
    "name",
    "lastname",
    "phone",
    "username",
    "shipping_address",
    "shipping_service",
    "observations",
    "rol",
  ];

  // Crear el objeto userData dinámicamente
  const userData = allowedFields.reduce((acc, field) => {
    if (req.body[field] !== undefined) {
      acc[field] = req.body[field];
    }
    return acc;
  }, {});

  try {
    const user = await User.findOne({ _id: id });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const updatedUser = await User.findOneAndUpdate({ _id: id }, userData, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(400).json({ message: "Error al actualizar usuario" });
    }

    // Seleccionar los campos que se devolverán en la respuesta
    const userResponse = {
      id: updatedUser._id,
      email: updatedUser.email,
      username: updatedUser.username,
      rol: updatedUser.rol || null,
      name: updatedUser.name || null,
      lastname: updatedUser.lastname || null,
      phone: updatedUser.phone || null,
      observations: updatedUser.observations || null,
      shipping_address: updatedUser.shipping_address || null,
      shipping_service: updatedUser.shipping_service || null,
    };

    return res.status(200).json({
      message: "Usuario actualizado con éxito",
      user: userResponse,
    });
  } catch (error) {
    console.error("Error actualizando usuario:", error);
    return res.status(500).json({ message: "Error actualizando usuario." });
  }
};

/**
 * Borrar un usuario por ID
 */
const deleteUser = async (req, res) => {
  const { id } = req.params;

  // Validar que el ID esté presente
  if (!id) {
    return res
      .status(400)
      .json({ message: "Se requiere un ID para eliminar el usuario." });
  }

  try {
    // Buscar y eliminar el usuario
    const deletedUser = await User.findOneAndDelete({ _id: id });

    // Verificar si el usuario fue encontrado y eliminado
    if (!deletedUser) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // Respuesta exitosa
    return res.status(200).json({
      message: "Usuario eliminado con éxito",
      deletedUserId: deletedUser._id, // Devolver el ID del usuario eliminado
    });
  } catch (error) {
    console.error("Error eliminando usuario:", error);

    // Manejar errores específicos
    if (error.name === "CastError") {
      return res.status(400).json({ message: "ID de usuario no válido." });
    }

    // Error genérico del servidor
    return res
      .status(500)
      .json({ message: "Error interno del servidor al eliminar el usuario." });
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
