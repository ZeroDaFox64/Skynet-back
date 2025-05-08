const Service = require("../models/Subscription/Service");
const { paginate } = require("../config/utils");

const createService = async (req, res) => {
  const { name, category, description } = req.body;

  // Validar que el nombre esté presente
  if (!name) {
    return res.status(400).json({ message: "El nombre del servicio es requerido." });
  }

  try {
    // Verificar si el nombre del servicio ya está en uso
    const isTaken = await Service.findOne({ name: name });
    if (isTaken) {
      return res.status(400).json({ message: "Este nombre ya está en uso." });
    }

    // Crear el objeto de datos del servicio
    const serviceData = {
      name,
      category: category || "streaming",
      description: description || null,
    };

    // Crear y guardar el nuevo servicio
    const service = new Service(serviceData);
    await service.save();

    // Respuesta exitosa
    return res.status(201).json({
      message: "Servicio creado con éxito.",
      service,
    });
  } catch (error) {
    console.error("Error creando el servicio:", error);

    // Manejar errores específicos
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: "Error de validación.", details: error.message });
    }

    // Error genérico del servidor
    return res.status(500).json({ message: "Error interno del servidor al crear el servicio." });
  }
};

const getServices = async (req, res) => {
  try {
    const { page = 1, limit = 20, filters } = req.query;

    // Construir el objeto de filtrado
    const filterQuery = {};

    if (filters) {
      // Crear un array con las propiedades del modelo Service que deseas buscar
      const searchableFields = [
        "name",
        "category",
        "description",
      ];

      // Crear un array de condiciones de búsqueda para cada campo
      const searchConditions = searchableFields.map((field) => ({
        [field]: { $regex: filters, $options: "i" },
      }));

      // Combinar las condiciones con el operador $or
      filterQuery.$or = searchConditions;
    }

    // Usar la función paginate para obtener los servicios
    const result = await paginate(Service, filterQuery, { page, limit });

    // Respuesta exitosa
    return res.status(200).json({
      services: result.docs,
      pagination: {
        totalServices: result.totalDocs,
        totalPages: result.totalPages,
        currentPage: result.page,
        limit: result.limit,
      },
    });
  } catch (error) {
    console.error("Error obteniendo servicios:", error);

    // Manejar errores específicos
    if (error.message === "Parámetros de paginación no válidos.") {
      return res.status(400).json({ message: error.message });
    }

    // Error genérico del servidor
    return res.status(500).json({ message: "Error interno del servidor al obtener los servicios." });
  }
};

const getService = async (req, res) => {
  const { id } = req.params;

  // Validar que el ID esté presente
  if (!id) {
    return res.status(400).json({ message: "Se requiere un ID de servicio." });
  }

  try {
    // Buscar el servicio por ID
    const service = await Service.findOne({ _id: id });

    // Verificar si el servicio existe
    if (!service) {
      return res.status(404).json({ message: "Servicio no encontrado." });
    }

    // Respuesta exitosa
    return res.status(200).json({
      message: "Servicio obtenido con éxito.",
      service,
    });
  } catch (error) {
    console.error("Error obteniendo servicio:", error);

    // Manejar errores específicos
    if (error.name === "CastError") {
      return res.status(400).json({ message: "ID de servicio no válido." });
    }

    // Error genérico del servidor
    return res.status(500).json({ message: "Error interno del servidor al obtener el servicio." });
  }
};

const updateService = async (req, res) => {
  const { name, category, description } = req.body;
  const { id } = req.params;

  // Validar que el ID esté presente
  if (!id) {
    return res.status(400).json({ message: "Se requiere un ID de servicio." });
  }

  try {
    // Buscar el servicio por ID
    const service = await Service.findOne({ _id: id });

    // Verificar si el servicio existe
    if (!service) {
      return res.status(404).json({ message: "Servicio no encontrado." });
    }

    // Crear el objeto de datos del servicio
    const serviceData = {};
    if (name) serviceData.name = name;
    if (category) serviceData.category = category;
    if (description) serviceData.description = description;

    // Actualizar el servicio
    const updatedService = await Service.findOneAndUpdate(
      { _id: id },
      serviceData,
      { new: true }
    );

    // Verificar si la actualización fue exitosa
    if (!updatedService) {
      return res.status(400).json({ message: "Error al actualizar el servicio." });
    }

    // Respuesta exitosa
    return res.status(200).json({
      message: "Servicio actualizado con éxito.",
      service: {
        id: updatedService._id,
        name: updatedService.name,
        category: updatedService.category,
        description: updatedService.description,
      },
    });
  } catch (error) {
    console.error("Error actualizando servicio:", error);

    // Manejar errores específicos
    if (error.name === "CastError") {
      return res.status(400).json({ message: "ID de servicio no válido." });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: "Error de validación.", details: error.message });
    }

    // Error genérico del servidor
    return res.status(500).json({ message: "Error interno del servidor al actualizar el servicio." });
  }
};

const deleteService = async (req, res) => {
  const { id } = req.params;

  // Validar que el ID esté presente
  if (!id) {
    return res.status(400).json({ message: "Se requiere un ID de servicio." });
  }

  try {
    // Buscar y eliminar el servicio por ID
    const deletedService = await Service.findOneAndDelete({ _id: id });

    // Verificar si el servicio fue encontrado y eliminado
    if (!deletedService) {
      return res.status(404).json({ message: "Servicio no encontrado." });
    }

    // Respuesta exitosa
    return res.status(200).json({
      message: "Servicio eliminado con éxito.",
      deletedServiceId: deletedService._id, // Devolver el ID del servicio eliminado
    });
  } catch (error) {
    console.error("Error eliminando servicio:", error);

    // Manejar errores específicos
    if (error.name === "CastError") {
      return res.status(400).json({ message: "ID de servicio no válido." });
    }

    // Error genérico del servidor
    return res.status(500).json({ message: "Error interno del servidor al eliminar el servicio." });
  }
};

module.exports = {
  createService,
  getServices,
  getService,
  updateService,
  deleteService,
};