const Account = require("../models/Subscription/Account");
const Service = require("../models/Subscription/Service");
const { paginate } = require("../config/utils");

/**
 * Crear una nueva cuenta
 */
const createAccount = async (req, res) => {
  const {
    email,
    password,
    service,
    provider,
    contract_date,
    cutoff_date,
    type,
    status,
    availability,
    maintenance,
    observations,
  } = req.body;

  // Validar que el email y la contraseña estén presentes
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "El email y la contraseña son requeridos." });
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json({ message: "Formato de correo electrónico inválido." });
  }

  try {
    // Verificar si el email ya está en uso
    const isTaken = await Account.findOne({ email: email.toLowerCase() });
    if (isTaken) {
      return res.status(400).json({ message: "Este email ya está en uso." });
    }

    // Crear el objeto de datos de la cuenta
    const accountData = {
      email: email.toLowerCase(),
      password: password,
      service: service || null,
      provider: provider || null,
      contract_date: contract_date || null,
      cutoff_date: cutoff_date || null,
      type: type || null,
      status: status || null,
      availability: availability || null,
      maintenance: maintenance || null,
      observations: observations || null,
    };

    // Crear y guardar la nueva cuenta
    const account = new Account(accountData);
    await account.save();

    // Respuesta exitosa
    return res.status(201).json({
      message: "Cuenta creada con éxito.",
      account: {
        id: account._id,
        email: account.email,
        service: account.service,
        provider: account.provider,
        contract_date: account.contract_date,
        cutoff_date: account.cutoff_date,
        type: account.type,
        status: account.status,
        availability: account.availability,
        maintenance: account.maintenance,
        observations: account.observations,
      },
    });
  } catch (error) {
    console.error("Error creando la cuenta:", error);

    // Manejar errores específicos
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Error de validación.", details: error.message });
    }

    // Error genérico del servidor
    return res
      .status(500)
      .json({ message: "Error interno del servidor al crear la cuenta." });
  }
};

/**
 * Obtener todas las cuentas
 */
const getAllAccounts = async (req, res) => {
  try {
    const accounts = await Account.find();
    return res.status(200).json({ accounts });
  } catch (error) {
    console.error("Error obteniendo cuentas:", error);
    return res.status(500).json({ message: "Error obteniendo cuentas." });
  }
};

/**
 * Obtener cuentas con paginación y filtros
 */
const getAccounts = async (req, res) => {
  try {
    const { page = 1, limit = 20, filters, service, maintenance, availability, type, status } = req.query;

    // Construir el objeto de filtrado
    const filterQuery = {};

    if (type) {
      filterQuery.type = type;
    }

    if (service) {
      const matchingServices = await Service.find({ name: { $regex: service, $options: "i" } });
      const serviceIds = matchingServices.map((service) => service._id);
      filterQuery.service = { $in: serviceIds };
    }

    if (maintenance) {
      filterQuery.maintenance = maintenance;
    }

    if (availability) {
      filterQuery.availability = availability;
    }

    if (status) {
      filterQuery.status = status;
    }

    // Si hay filtros, agregar condiciones de búsqueda
    if (filters) {
      // Campos de tipo string para aplicar $regex
      const searchableFields = [
        "email",
        "type",
        "availability",
        "maintenance",
        "status",
      ];

      const searchConditions = searchableFields.map((field) => ({
        [field]: { $regex: filters, $options: "i" }, // Aplicar $regex solo a campos de tipo string
      }));

      // Combinar condiciones con el operador $or
      filterQuery.$or = searchConditions;
    }

    // Opciones para la función paginate
    const paginateOptions = {
      page,
      limit,
      sortBy: "cutoff_date", // Ordenar por fecha de corte más cercana
      sortOrder: "asc",      // De la más cercana a la más lejana
      populate: ["service"], // Poblar la relación "service" (si existe)
    };

    // Usar la función paginate para obtener las cuentas
    const result = await paginate(Account, filterQuery, paginateOptions);

    // Respuesta exitosa
    return res.status(200).json({
      accounts: result.docs,
      pagination: {
        totalAccounts: result.totalDocs,
        totalPages: result.totalPages,
        currentPage: result.page,
        limit: result.limit,
      },
    });
  } catch (error) {
    console.error("Error obteniendo cuentas:", error);

    // Manejar errores específicos
    if (error.message === "Parámetros de paginación no válidos.") {
      return res.status(400).json({ message: error.message });
    }

    // Error genérico del servidor
    return res
      .status(500)
      .json({ message: "Error interno del servidor al obtener las cuentas." });
  }
};

/**
 * Obtener una cuenta por ID
 */
const getAccount = async (req, res) => {
  const { id } = req.params;

  // Validar que el ID esté presente
  if (!id) {
    return res.status(400).json({ message: "Se requiere un ID de cuenta." });
  }

  try {
    // Buscar la cuenta por ID
    const account = await Account.findOne({ _id: id });

    // Verificar si la cuenta existe
    if (!account) {
      return res.status(404).json({ message: "Cuenta no encontrada." });
    }

    // Respuesta exitosa
    return res.status(200).json({
      message: "Cuenta obtenida con éxito.",
      account,
    });
  } catch (error) {
    console.error("Error obteniendo cuenta:", error);

    // Manejar errores específicos
    if (error.name === "CastError") {
      return res.status(400).json({ message: "ID de cuenta no válido." });
    }

    // Error genérico del servidor
    return res
      .status(500)
      .json({ message: "Error interno del servidor al obtener la cuenta." });
  }
};

/**
 * Actualizar una cuenta por ID
 */
const updateAccount = async (req, res) => {
  const {
    email,
    password,
    service,
    provider,
    contract_date,
    cutoff_date,
    type,
    status,
    availability,
    maintenance,
    observations,
  } = req.body;
  const { id } = req.params;

  // Validar que el ID esté presente
  if (!id) {
    return res.status(400).json({ message: "Se requiere un ID de cuenta." });
  }

  try {
    // Buscar la cuenta por ID
    const account = await Account.findOne({ _id: id });

    // Verificar si la cuenta existe
    if (!account) {
      return res.status(404).json({ message: "Cuenta no encontrada." });
    }

    // Crear el objeto de datos de la cuenta
    const accountData = {
      email: email || email.toLowerCase(),
      password: password,
      service: service,
      provider: provider,
      contract_date: contract_date,
      cutoff_date: cutoff_date,
      type: type || null,
      status: status || null,
      availability: availability || null,
      maintenance: maintenance || null,
      observations: observations || null,
    };

    // Actualizar la cuenta
    const updatedAccount = await Account.findOneAndUpdate(
      { _id: id },
      accountData,
      { new: true }
    );

    // Verificar si la actualización fue exitosa
    if (!updatedAccount) {
      return res
        .status(400)
        .json({ message: "Error al actualizar la cuenta." });
    }

    // Respuesta exitosa
    return res.status(200).json({
      message: "Cuenta actualizada con éxito.",
      account: {
        id: updatedAccount._id,
        email: updatedAccount.email,
        service: updatedAccount.service,
        provider: updatedAccount.provider,
        contract_date: updatedAccount.contract_date,
        cutoff_date: updatedAccount.cutoff_date,
        type: updatedAccount.type,
        status: updatedAccount.status,
        availability: updatedAccount.availability,
        maintenance: updatedAccount.maintenance,
        observations: updatedAccount.observations,
      },
    });
  } catch (error) {
    console.error("Error actualizando cuenta:", error);

    // Manejar errores específicos
    if (error.name === "CastError") {
      return res.status(400).json({ message: "ID de cuenta no válido." });
    }

    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Error de validación.", details: error.message });
    }

    // Error genérico del servidor
    return res
      .status(500)
      .json({ message: "Error interno del servidor al actualizar la cuenta." });
  }
};

/**
 * Borrar una cuenta por ID
 */
const deleteAccount = async (req, res) => {
  const { id } = req.params;

  // Validar que el ID esté presente
  if (!id) {
    return res.status(400).json({ message: "Se requiere un ID de cuenta." });
  }

  try {
    // Buscar y eliminar la cuenta por ID
    const deletedAccount = await Account.findOneAndDelete({ _id: id });

    // Verificar si la cuenta fue encontrada y eliminada
    if (!deletedAccount) {
      return res.status(404).json({ message: "Cuenta no encontrada." });
    }

    // Respuesta exitosa
    return res.status(200).json({
      message: "Cuenta eliminada con éxito.",
      deletedAccountId: deletedAccount._id, // Devolver el ID de la cuenta eliminada
    });
  } catch (error) {
    console.error("Error eliminando cuenta:", error);

    // Manejar errores específicos
    if (error.name === "CastError") {
      return res.status(400).json({ message: "ID de cuenta no válido." });
    }

    // Error genérico del servidor
    return res.status(500).json({ message: "Error interno del servidor al eliminar la cuenta." });
  }
};

/**
 * Migrar usuarios de una cuenta a otra
 */
const migrateAccountUsers = async (req, res) => {
  const { id } = req.params;
  const { newAccount } = req.body;

  try {
    // Buscar la cuenta a migrar
    const originAccount = await Account.findById(id);
    if (!originAccount) {
      return res.status(404).json({ message: "Cuenta no encontrada." });
    }

    // Buscar la cuenta destino
    const destinationAccount = await Account.findById(newAccount);
    if (!destinationAccount) {
      return res.status(404).json({ message: "Cuenta destino no encontrada." });
    }

    // Validar que la cuenta de origen no sea la cuenta de destino
    if (originAccount._id === destinationAccount._id) {
      return res.status(400).json({ message: "La cuenta de origen y destino son iguales." });
    }

    if (originAccount.users.length < 1) {
      return res.status(400).json({ message: "La cuenta de origen no debe estar vacía." });
    }

    if (destinationAccount.users.length > 0) {
      return res.status(400).json({ message: "La cuenta de destino debe estar vacía." });
    }

    // Actualizar la lista de usuarios de la cuenta destino
    destinationAccount.users = originAccount.users;
    const updatedDestinationAccount = await destinationAccount.save();

    // Actualizar la lista de usuarios de la cuenta origen
    originAccount.users = [];
    const updatedOriginAccount = await originAccount.save();

    // Respuesta exitosa
    if (updatedDestinationAccount && updatedOriginAccount) {
      return res.status(200).json({
        message: "Cuentas migradas correctamente.",
        originAccount: updatedOriginAccount,
        destinationAccount: updatedDestinationAccount,
      });
    }
    
    return res.status(400).json({ message: "Error al migrar las cuentas." });
  } catch (error) {
    console.error("Error migrando cuenta:", error);
  }
};

module.exports = {
  createAccount,
  getAllAccounts,
  getAccounts,
  getAccount,
  updateAccount,
  deleteAccount,
  migrateAccountUsers,
};
