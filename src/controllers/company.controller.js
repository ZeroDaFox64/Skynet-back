const Company = require("../models/Company");
const { Op } = require('sequelize');

/**
 * Registrar una nueva empresa
 */
const createCompany = async (req, res) => {
  const { rif, name, description, address, city, state, country, phone, email } = req.body;

  // 1. Validar campos obligatorios básicos
  if (!rif || !name || !email) {
    return res.status(400).json({
      message: "Datos incompletos: faltan datos obligatorios (rif, name, email)",
    });
  }

  try {
    // 2. Verificar si la empresa ya existe por RIF o Email
    const existingCompany = await Company.findOne({
      where: {
        [Op.or]: [{ rif }, { email }]
      }
    });

    if (existingCompany) {
      return res.status(400).json({
        message: "El RIF o correo electrónico ya está registrado",
      });
    }

    // 3. Crear la empresa
    const newCompany = await Company.create({
      rif,
      name,
      description: description || '',
      address: address || '',
      city: city || '',
      state: state || '',
      country: country || '',
      phone: phone || '',
      email: email.toLowerCase(),
    });

    return res.status(201).json({
      message: "Empresa registrada exitosamente",
      company: newCompany,
    });

  } catch (err) {
    if (err.name === "SequelizeValidationError" || err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        message: "Error de validación: " + err.errors.map(e => e.message).join(", ")
      });
    }

    console.error("Error en createCompany:", err);
    return res.status(500).json({
      message: "Error interno del servidor al registrar la empresa"
    });
  }
};

/**
 * Obtener todas las empresas (sin paginación)
 */
const getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.findAll({
      order: [['createdAt', 'DESC']]
    });

    if (companies.length === 0) {
      return res.status(404).json({ message: "No se encontraron empresas." });
    }

    return res.status(200).json({
      message: "Empresas obtenidas con éxito",
      companies,
    });
  } catch (error) {
    console.error("Error obteniendo empresas:", error);
    return res.status(500).json({ message: "Error interno del servidor al obtener las empresas." });
  }
};

/**
 * Obtener empresas con paginación y filtros
 */
const getCompanies = async (req, res) => {
  try {
    const { page = 1, limit = 20, filters } = req.query;

    // 1. Convertir a números para evitar errores en el cálculo
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // 2. Construir el objeto de filtrado (where)
    const where = {};

    if (filters) {
      // Usamos [Op.or] y [Op.iLike] para búsqueda parcial e insensible a mayúsculas
      where[Op.or] = [
        { name: { [Op.iLike]: `%${filters}%` } },
        { rif: { [Op.iLike]: `%${filters}%` } },
        { email: { [Op.iLike]: `%${filters}%` } }
      ];
    }

    // 3. Consultar usando findAndCountAll (devuelve filas y el total)
    const { count, rows } = await Company.findAndCountAll({
      where,
      limit: limitNum,
      offset: offset,
      order: [['createdAt', 'DESC']], // 'createdAt' es el estándar de Sequelize
    });

    // 4. Calcular metadata de paginación
    const totalPages = Math.ceil(count / limitNum);

    return res.status(200).json({
      companies: rows,
      pagination: {
        totalCompanies: count,
        totalPages: totalPages,
        currentPage: pageNum,
        limit: limitNum,
      },
    });

  } catch (error) {
    console.error("Error obteniendo empresas:", error);

    if (error.name === 'SequelizeDatabaseError') {
      return res.status(400).json({ message: "Error en la consulta a la base de datos." });
    }

    return res.status(500).json({
      message: "Error interno del servidor al obtener las empresas."
    });
  }
};

/**
 * Obtener una empresa por ID
 */
const getCompany = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Se requiere un ID para obtener la empresa." });
  }

  try {
    const company = await Company.findByPk(id);

    if (!company) {
      return res.status(404).json({ message: "Empresa no encontrada." });
    }

    return res.status(200).json({ company });

  } catch (error) {
    console.error("Error obteniendo empresa:", error);
    if (error.name === "SequelizeDatabaseError") {
      return res.status(400).json({ message: "ID de empresa no válido." });
    }
    return res.status(500).json({ message: "Error interno del servidor al obtener la empresa." });
  }
};

/**
 * Actualizar una empresa por ID
 */
const updateCompany = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "No se ha encontrado un ID" });
  }

  const allowedFields = ["rif", "name", "description", "address", "city", "state", "country", "phone", "email"];

  const companyData = allowedFields.reduce((acc, field) => {
    if (req.body[field] !== undefined) {
      acc[field] = req.body[field];
    }
    return acc;
  }, {});

  try {
    const company = await Company.findByPk(id);

    if (!company) {
      return res.status(404).json({ message: "Empresa no encontrada" });
    }

    await company.update(companyData);

    return res.status(200).json({
      message: "Empresa actualizada con éxito",
      company,
    });

  } catch (error) {
    console.error("Error actualizando empresa:", error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: "El RIF o email ya está en uso por otra empresa." });
    }

    return res.status(500).json({ message: "Error interno al actualizar empresa." });
  }
};

/**
 * Borrar una empresa por ID
 */
const deleteCompany = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Se requiere un ID para eliminar la empresa." });
  }

  try {
    const deletedRows = await Company.destroy({
      where: { id: id }
    });

    if (deletedRows === 0) {
      return res.status(404).json({ message: "Empresa no encontrada." });
    }

    return res.status(200).json({
      message: "Empresa eliminada con éxito",
      deletedCompanyId: id,
    });

  } catch (error) {
    console.error("Error eliminando empresa:", error);
    if (error.name === "SequelizeDatabaseError") {
      return res.status(400).json({ message: "ID de empresa no válido." });
    }
    return res.status(500).json({ message: "Error interno del servidor al eliminar la empresa." });
  }
};

module.exports = {
  createCompany,
  getAllCompanies,
  getCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
};
