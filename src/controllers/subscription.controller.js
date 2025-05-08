const Subscription = require("../models/Subscription/Subscription");
const Account = require("../models/Subscription/Account");
const User = require("../models/User/User");
const Service = require("../models/Subscription/Service");
const moment = require("moment");
const { paginate } = require("../config/utils");

const createSubscription = async (req, res) => {
  const {
    user,
    account,
    nickname,
    pay_status,
    contract_date,
    cutoff_number,
    type,
    pin,
    service,
    observations,
  } = req.body;

  try {
    // Validar datos mínimos requeridos
    if (!user || !service || !type || !contract_date) {
      return res.status(400).json({ message: "Faltan campos obligatorios." });
    }

    // Preparar los datos de la suscripción
    const subscriptionData = {
      user: user || null,
      service: service || null,
      type: type || null,
      contract_date: contract_date || null,
      cutoff_date:
        cutoff_number >= 1
          ? moment(contract_date)
              .add(cutoff_number, "months")
              .format("YYYY-MM-DD")
          : moment(contract_date).add(1, "months").format("YYYY-MM-DD"),
      nickname: nickname || null,
      status: "active",
      pay_status: pay_status || null,
      pin: pin || null,
      observations: observations || null,
    };

    // Si se proporciona una cuenta, validar y asignar
    if (account) {
      const accountData = await Account.findById(account);

      if (!accountData) {
        return res.status(404).json({ message: "La cuenta no existe." });
      }

      // Validar disponibilidad de la cuenta
      if (accountData.availability === "full") {
        return res.status(400).json({ message: "La cuenta está llena." });
      }
      if (accountData.maintenance === "true") {
        return res
          .status(400)
          .json({ message: "La cuenta está en mantenimiento." });
      }
      if (
        accountData.status === "under_review" ||
        accountData.status === "expired"
      ) {
        return res.status(400).json({ message: "La cuenta está cerrada." });
      }
      if (
        subscriptionData.service.toString() !== accountData.service.toString()
      ) {
        return res.status(400).json({
          message: "La cuenta no pertenece al servicio seleccionado.",
        });
      }

      // Asignar la cuenta a la suscripción
      subscriptionData.account = account;
    }

    // Si no se proporciona una cuenta, buscar una disponible
    if (!subscriptionData.account) {
      const queryParams = {
        status: { $in: ["available"] },
        availability: { $in: ["empty", "partial"] },
        maintenance: "false",
        type: subscriptionData.type,
        service: subscriptionData.service,
      };

      let availableAccounts = await Account.find(queryParams);

      // Si no hay cuentas disponibles del tipo "shared", buscar cuentas "single"
      if (!availableAccounts.length && subscriptionData.type === "shared") {
        availableAccounts = await Account.find({
          status: { $in: ["available"] },
          availability: "empty",
          maintenance: "false",
          type: "single",
          service: subscriptionData.service,
        });
      }

      // Si no hay cuentas disponibles
      if (!availableAccounts.length) {
        return res.status(400).json({
          message:
            "No se encontró una cuenta disponible para esta suscripción.",
        });
      }

      // Seleccionar la cuenta más próxima a vencer
      const sortedAccounts = availableAccounts.sort((a, b) =>
        moment(a.cutoff_date).diff(moment(b.cutoff_date))
      );
      const selectedAccount = sortedAccounts[0];

      // Asignar la cuenta seleccionada
      subscriptionData.account = selectedAccount._id;
    }

    // Crear la suscripción
    const newSubscription = new Subscription(subscriptionData);
    await newSubscription.save();

    // Populate la suscripción
    const populatedSubscription = await Subscription.findById(
      newSubscription._id
    )
      .populate("account")
      .populate("user")
      .populate("service");

    // Actualizar la cuenta asignada
    const accountToUpdate = await Account.findById(subscriptionData.account);
    if (accountToUpdate) {
      // Agregar la suscripción a la lista de usuarios de la cuenta
      accountToUpdate.users.push(newSubscription._id);

      // Actualizar la disponibilidad de la cuenta
      if (accountToUpdate.type === "single") {
        if (accountToUpdate.users.length === 1) {
          accountToUpdate.availability = "full";
        } else {
          accountToUpdate.availability = "empty";
        }
      } else {
        if (accountToUpdate.users.length <= 4) {
          accountToUpdate.availability = "partial";
        } else if (accountToUpdate.users.length >= 5) {
          accountToUpdate.availability = "full";
        }
      }

      // Cambiar el tipo de cuenta a "shared" si es necesario
      if (subscriptionData.type !== accountToUpdate.type) {
        accountToUpdate.type = "shared";
      }

      // Guardar los cambios en la cuenta
      await accountToUpdate.save();
    }

    // Respuesta exitosa
    return res.status(201).json({ newSubscription: populatedSubscription });
  } catch (error) {
    console.error("Error creando la suscripción:", error);
    return res.status(500).json({ message: "Error interno del servidor." });
  }
};

const getUserSubscriptions = async (req, res) => {
  const { id } = req.params;

  try {
    const subscriptions = await Subscription.find({
      user: id,
      pay_status: { $ne: 'canceled' },
    })
      .populate("account")
      .populate("service");
    return res.status(200).json( subscriptions );
  } catch (error) {
    console.error("Error obteniendo suscripciones:", error);
    return res
      .status(500)
      .json({
        message: "Error obteniendo suscripciones.",
        error: error.message,
      });
  }
};

const getSubscriptions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      filters,
      status,
      pay_status,
      type,
      service,
    } = req.query;

    // Construir el objeto de filtrado
    const filterQuery = {};

    if (status) {
      filterQuery.status = status;
    }

    if (pay_status) {
      filterQuery.pay_status = pay_status;
    }

    if (type) {
      filterQuery.type = type;
    }

    if (service) {
      const matchingServices = await Service.find({
        name: { $regex: service, $options: "i" },
      });
      const serviceIds = matchingServices.map((service) => service._id);
      filterQuery.service = { $in: serviceIds };
    }

    // Si hay filtros, agregar condiciones de búsqueda
    if (filters) {
      // Buscar coincidencias en Account (email)
      const matchingAccounts = await Account.find({
        email: { $regex: filters, $options: "i" },
      });
      const accountIds = matchingAccounts.map((account) => account._id);

      // Buscar coincidencias en User (phone)
      const matchingUsers = await User.find({
        phone: { $regex: filters, $options: "i" },
      });
      const userIds = matchingUsers.map((user) => user._id);

      // Crear un array para almacenar todas las condiciones
      const searchConditions = [];

      // Si se encontraron cuentas, agregar la condición para account
      if (accountIds.length > 0) {
        searchConditions.push({ account: { $in: accountIds } });
      }

      // Si se encontraron usuarios, agregar la condición para user
      if (userIds.length > 0) {
        searchConditions.push({ user: { $in: userIds } });
      }

      // Campos de tipo string para aplicar $regex
      const searchableFields = ["pay_status", "type"];
      searchableFields.forEach((field) => {
        searchConditions.push({ [field]: { $regex: filters, $options: "i" } });
      });

      // Combinar todas las condiciones con el operador $or
      filterQuery.$or = searchConditions;
    }

    // Opciones para la función paginate
    const paginateOptions = {
      page,
      limit,
      sortBy: "cutoff_date", // Ordenar por fecha de corte más cercana
      sortOrder: "asc", // De la más cercana a la más lejana
      populate: ["account", "user", "service"], // Poblar las relaciones "account" y "user"
    };

    // Usar la función paginate para obtener las suscripciones
    const result = await paginate(Subscription, filterQuery, paginateOptions);

    return res.status(200).json({
      subscriptions: result.docs,
      pagination: {
        totalSubscriptions: result.totalDocs,
        totalPages: result.totalPages,
        currentPage: result.page,
        limit: result.limit,
      },
    });
  } catch (error) {
    console.error("Error obteniendo suscripciones:", error);
    return res
      .status(500)
      .json({
        message: "Error obteniendo suscripciones.",
        error: error.message,
      });
  }
};

const getSubscription = async (req, res) => {
  const { populate } = req.query;
  try {
    let subscription;
    if (populate) {
      subscription = await Subscription.findById(req.params.id)
        .populate("account")
        .populate("user")
        .populate("service");
    } else {
      subscription = await Subscription.findById(req.params.id);
    }
    res.status(200).json({ subscription });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error getting subscription", error: error.message });
  }
};

const updateSubscription = async (req, res) => {
  const { id } = req.params;
  const {
    nickname,
    pay_status,
    contract_date,
    cutoff_date,
    observations,
    pin,
    type,
    // user, // No se usa
    // account, // No se usa
    // service, // No se usa
  } = req.body;

  try {
    // Buscar la suscripción
    const subscription = await Subscription.findById(id);

    // Si la suscripción no existe
    if (!subscription) {
      return res.status(404).json({ message: "Suscripción no encontrada." });
    }

    // Si la suscripción está cancelada, no se puede modificar
    if (subscription.pay_status === "canceled") {
      return res
        .status(400)
        .json({ message: "Esta suscripción está cancelada." });
    }

    // Actualizar los campos de la suscripción
    subscription.nickname = nickname;
    subscription.pay_status = pay_status;
    subscription.contract_date = contract_date;
    subscription.cutoff_date = cutoff_date;
    subscription.observations = observations;
    subscription.type = type;
    subscription.pin = pin;

    // Si el pay_status es "canceled", actualizar la cuenta asociada
    if (pay_status === "canceled") {
      // Obtener la cuenta asociada
      const account = await Account.findById(subscription.account);

      if (!account) {
        return res
          .status(404)
          .json({ message: "Cuenta asociada no encontrada." });
      }

      // Eliminar la suscripción del arreglo users
      account.users.pull(subscription.id);

      // Determinar la disponibilidad basada en la longitud actualizada de users
      let availability;
      if (account.type === "single") {
        if (account.users.length === 1) {
          availability = "full";
        } else {
          availability = "empty";
        }
      } else {
        if (account.users.length === 5) {
          availability = "full";
        } else if (account.users.length <= 4 && account.users.length > 0) {
          availability = "partial";
        } else if (account.users.length === 0) {
          availability = "empty";
        }
      }

      // Actualizar la cuenta asociada
      account.availability = availability;
      account.maintenance = "true"; // Actualizar el mantenimiento a true
      await account.save();

      // Cambiar el estado de la suscripción a "inactive"
      subscription.status = "inactive";
    }

    // Guardar los cambios en la suscripción
    await subscription.save();

    return res.status(200).json({
      message: "Suscripción actualizada correctamente.",
      subscription,
    });
  } catch (error) {
    console.error("Error actualizando la suscripción:", error);
    res.status(500).json({
      message: "Error actualizando la suscripción.",
      error: error.message,
    });
  }
};

const deleteSubscription = async (req, res) => {
  try {
    // Eliminar la suscripción y obtener el documento eliminado
    const subscription = await Subscription.findByIdAndDelete(req.params.id);

    if (!subscription) {
      return res.status(404).json({ message: "Suscripción no encontrada." });
    }

    // Obtener la cuenta asociada
    const account = await Account.findById(subscription.account);

    if (!account) {
      return res
        .status(404)
        .json({ message: "Cuenta asociada no encontrada." });
    }

    // Eliminar la suscripción del arreglo users
    account.users.pull(subscription.id);

    // Determinar la disponibilidad basada en la longitud actualizada de users
    let availability;
    if (account.type === "single") {
      if (account.users.length === 1) {
        availability = "full";
      } else {
        availability = "empty";
      }
    } else {
      if (account.users.length === 5) {
        availability = "full";
      } else if (account.users.length <= 4 && account.users.length > 0) {
        availability = "partial";
      } else if (account.users.length === 0) {
        availability = "empty";
      }
    }

    // Actualizar la cuenta asociada
    account.availability = availability;
    account.maintenance = "true"; // Actualizar el mantenimiento a true
    await account.save();

    res.status(200).json({
      message: "Suscripción eliminada correctamente.",
      subscription,
      account,
    });
  } catch (error) {
    console.error("Error al eliminar la suscripción:", error);
    res.status(500).json({
      message: "Error al eliminar la suscripción.",
      error: error.message,
    });
  }
};

const migrateSubscription = async (req, res) => {
  const { id } = req.params;
  const { account } = req.body;

  try {
    // Buscar la suscripcion a migrar
    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({ message: "Suscripcion no encontrada." });
    }

    // Buscar la cuenta actual
    const currentAccount = await Account.findById(subscription.account);
    if (!currentAccount) {
      return res.status(404).json({ message: "Cuenta no encontrada." });
    }

    // Buscar la cuenta nueva si se proporciona
    let newAccount;
    if (account) {
      providedAccount = await Account.findById(account);
      if (!providedAccount) {
        return res.status(404).json({ message: "Cuenta no encontrada." });
      }

      // Validar disponibilidad de la cuenta
      if (providedAccount.availability === "full") {
        return res.status(400).json({ message: "La cuenta está llena." });
      }
      if (providedAccount.maintenance === "true") {
        return res
          .status(400)
          .json({ message: "La cuenta está en mantenimiento." });
      }
      if (
        providedAccount.status === "under_review" ||
        providedAccount.status === "expired"
      ) {
        return res.status(400).json({ message: "La cuenta está cerrada." });
      }
      if (
        subscription.service.toString() !== providedAccount.service.toString()
      ) {
        return res.status(400).json({
          message: "La cuenta no pertenece al servicio seleccionado.",
        });
      }
      newAccount = providedAccount;
    } else {
      // Buscar una cuenta disponible
      newAccount = await Account.findOne({
        status: { $in: ["available"] },
        availability: { $in: ["empty", "partial"] },
        maintenance: "false",
        type: subscription.type,
        service: subscription.service,
      });

      if (!newAccount) {
        return res.status(400).json({
          message:
            "No se encontró una cuenta disponible para esta suscripción.",
        });
      }
    }

    // Modificar la lista de usuarios de la cuenta nueva
    if (!newAccount?.users.includes(subscription.id)) {
      newAccount.users.push(subscription.id);
    }

    let availability;
    if (newAccount.type === "single") {
      if (newAccount.users.length === 1) {
        availability = "full";
      } else {
        availability = "empty";
      }
    }

    if (newAccount.type === "shared") {
      if (newAccount.users.length === 5) {
        availability = "full";
      } else if (newAccount.users.length <= 4 && newAccount.users.length > 0) {
        availability = "partial";
      } else if (newAccount.users.length === 0) {
        availability = "empty";
      }
    }

    newAccount.availability = availability;
    const savedNewAccount = await newAccount.save({ new: true });

    // Modificar la lista de usuarios de la cuenta anterior
    if (account != subscription.account) {
      currentAccount.users.pull(subscription.id);
      currentAccount.maintenance = "true";
    }

    if (currentAccount.type === "single") {
      if (currentAccount.users.length === 1) {
        availability = "full";
      } else {
        availability = "empty";
      }
    }

    if (currentAccount.type === "shared") {
      if (currentAccount.users.length === 5) {
        availability = "full";
      } else if (
        currentAccount.users.length <= 4 &&
        currentAccount.users.length > 0
      ) {
        availability = "partial";
      } else if (currentAccount.users.length === 0) {
        availability = "empty";
      }
    }
    currentAccount.availability = availability;
    await currentAccount.save();

    // Modificar la suscripcion
    subscription.account = savedNewAccount._id;
    if (subscription.pay_status === "canceled") {
      subscription.pay_status = "paid";
      subscription.status = "active";
    }
    const updatedSubscription = await subscription.save({ new: true });

    // Respuesta exitosa
    return res.status(200).json({
      message: "Suscripcion migrada correctamente.",
      subscription: updatedSubscription,
      account: savedNewAccount,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al migrar las suscripciones.",
      error: error.message,
    });
  }
};

module.exports = {
  createSubscription,
  getSubscriptions,
  getUserSubscriptions,
  getSubscription,
  updateSubscription,
  deleteSubscription,
  migrateSubscription,
};
