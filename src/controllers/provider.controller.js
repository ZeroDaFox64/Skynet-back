const Provider = require("../models/Subscription/Provider");
const { paginate } = require("../config/utils");

const createProvider = async (req, res) => {
  const { name, contact, description } = req.body;

  // Validar que el nombre esté presente
  if (!name) {
    return res.status(400).json({ message: "El nombre del proveedor es requerido." });
  }

  try {
    // Verificar si el nombre del proveedor ya está en uso
    const isTaken = await Provider.findOne({ name: name });
    if (isTaken) {
      return res.status(400).json({ message: "Este nombre ya está en uso." });
    }

    // Crear el objeto de datos del proveedor
    const providerData = {
      name,
      contact: contact || null, // Valor por defecto si no se proporciona
      description: description || null, // Valor por defecto si no se proporciona
    };

    // Crear y guardar el nuevo proveedor
    const provider = new Provider(providerData);
    await provider.save();

    // Respuesta exitosa
    return res.status(201).json({
      message: "Proveedor creado con éxito.",
      provider,
    });
  } catch (error) {
    console.error("Error creando el proveedor:", error);

    // Manejar errores específicos
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: "Error de validación.", details: error.message });
    }

    // Error genérico del servidor
    return res.status(500).json({ message: "Error interno del servidor al crear el proveedor." });
  }
};

const getProviders = async (req, res) => {
  try {
    const { page = 1, limit = 20, filters } = req.query;

    // Construir el objeto de filtrado
    const filterQuery = {};

    if (filters) {
      // Crear un array con las propiedades del modelo Provider que deseas buscar
      const searchableFields = [
        "name",
        "contact",
        "description",
      ];

      // Crear un array de condiciones de búsqueda para cada campo
      const searchConditions = searchableFields.map((field) => ({
        [field]: { $regex: filters, $options: "i" },
      }));

      // Combinar las condiciones con el operador $or
      filterQuery.$or = searchConditions;
    }

    // Usar la función paginate para obtener los proveedores
    const result = await paginate(Provider, filterQuery, { page, limit });

    // Respuesta exitosa
    return res.status(200).json({
      providers: result.docs,
      pagination: {
        totalProviders: result.totalDocs,
        totalPages: result.totalPages,
        currentPage: result.page,
        limit: result.limit,
      },
    });
  } catch (error) {
    console.error("Error obteniendo proveedores:", error);

    // Manejar errores específicos
    if (error.message === "Parámetros de paginación no válidos.") {
      return res.status(400).json({ message: error.message });
    }

    // Error genérico del servidor
    return res.status(500).json({ message: "Error interno del servidor al obtener los proveedores." });
  }
};

const getProvider = async (req, res) => {
  const { id } = req.params;

  // Validar que el ID esté presente
  if (!id) {
    return res.status(400).json({ message: "Se requiere un ID de proveedor." });
  }

  try {
    // Buscar el proveedor por ID
    const provider = await Provider.findOne({ _id: id });

    // Verificar si el proveedor existe
    if (!provider) {
      return res.status(404).json({ message: "Proveedor no encontrado." });
    }

    // Respuesta exitosa
    return res.status(200).json({
      message: "Proveedor obtenido con éxito.",
      provider,
    });
  } catch (error) {
    console.error("Error obteniendo proveedor:", error);

    // Manejar errores específicos
    if (error.name === "CastError") {
      return res.status(400).json({ message: "ID de proveedor no válido." });
    }

    // Error genérico del servidor
    return res.status(500).json({ message: "Error interno del servidor al obtener el proveedor." });
  }
};

const updateProvider = async (req, res) => {
  const { name, contact, description } = req.body;
  const { id } = req.params;

  // Validar que el ID esté presente
  if (!id) {
    return res.status(400).json({ message: "Se requiere un ID de proveedor." });
  }

  // Validar que al menos un campo esté presente para actualizar
  if (!name && !contact && !description) {
    return res.status(400).json({ message: "Se requiere al menos un campo para actualizar." });
  }

  try {
    // Buscar el proveedor por ID
    const provider = await Provider.findOne({ _id: id });

    // Verificar si el proveedor existe
    if (!provider) {
      return res.status(404).json({ message: "Proveedor no encontrado." });
    }

    // Crear el objeto de datos del proveedor
    const providerData = {};
    if (name) providerData.name = name;
    if (contact) providerData.contact = contact;
    if (description) providerData.description = description;

    // Actualizar el proveedor
    const updatedProvider = await Provider.findOneAndUpdate(
      { _id: id },
      providerData,
      { new: true } // Devuelve el documento actualizado
    );

    // Verificar si la actualización fue exitosa
    if (!updatedProvider) {
      return res.status(400).json({ message: "Error al actualizar el proveedor." });
    }

    // Respuesta exitosa
    return res.status(200).json({
      message: "Proveedor actualizado con éxito.",
      provider: {
        id: updatedProvider._id,
        name: updatedProvider.name,
        contact: updatedProvider.contact,
        description: updatedProvider.description,
      },
    });
  } catch (error) {
    console.error("Error actualizando proveedor:", error);

    // Manejar errores específicos
    if (error.name === "CastError") {
      return res.status(400).json({ message: "ID de proveedor no válido." });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: "Error de validación.", details: error.message });
    }

    // Error genérico del servidor
    return res.status(500).json({ message: "Error interno del servidor al actualizar el proveedor." });
  }
};

const deleteProvider = async (req, res) => {
  const { id } = req.params;

  // Validar que el ID esté presente
  if (!id) {
    return res.status(400).json({ message: "Se requiere un ID de proveedor." });
  }

  try {
    // Buscar y eliminar el proveedor por ID
    const deletedProvider = await Provider.findOneAndDelete({ _id: id });

    // Verificar si el proveedor fue encontrado y eliminado
    if (!deletedProvider) {
      return res.status(404).json({ message: "Proveedor no encontrado." });
    }

    // Respuesta exitosa
    return res.status(200).json({
      message: "Proveedor eliminado con éxito.",
      deletedProviderId: deletedProvider._id, // Devolver el ID del proveedor eliminado
    });
  } catch (error) {
    console.error("Error eliminando proveedor:", error);

    // Manejar errores específicos
    if (error.name === "CastError") {
      return res.status(400).json({ message: "ID de proveedor no válido." });
    }

    // Error genérico del servidor
    return res.status(500).json({ message: "Error interno del servidor al eliminar el proveedor." });
  }
};

module.exports = {
  createProvider,
  getProviders,
  getProvider,
  updateProvider,
  deleteProvider,
};