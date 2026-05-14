const Product = require("../models/Product");
const { Op } = require('sequelize');

/**
 * Registrar un nuevo producto
 */
const createProduct = async (req, res) => {
  const { sku, name, price, product_category, description, front_image } = req.body;

  // 1. Validar campos obligatorios
  if (!sku || !name || !price || !product_category) {
    return res.status(400).json({
      message: "Datos incompletos: faltan datos obligatorios (sku, name, price, product_category)",
    });
  }

  try {
    // 2. Verificar si el producto ya existe por SKU
    const existingProduct = await Product.findOne({
      where: { sku }
    });

    if (existingProduct) {
      return res.status(400).json({
        message: "El SKU ya está registrado",
      });
    }

    // 3. Crear el producto
    const newProduct = await Product.create({
      sku,
      name,
      price,
      product_category,
      description: description || '',
      front_image: front_image || '',
    });

    return res.status(201).json({
      message: "Producto registrado exitosamente",
      product: newProduct,
    });

  } catch (err) {
    if (err.name === "SequelizeValidationError" || err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        message: "Error de validación: " + err.errors.map(e => e.message).join(", ")
      });
    }

    console.error("Error en createProduct:", err);
    return res.status(500).json({
      message: "Error interno del servidor al registrar el producto"
    });
  }
};

/**
 * Obtener todos los productos (sin paginación)
 */
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      order: [['createdAt', 'DESC']]
    });

    if (products.length === 0) {
      return res.status(404).json({ message: "No se encontraron productos." });
    }

    return res.status(200).json({
      message: "Productos obtenidos con éxito",
      products,
    });
  } catch (error) {
    console.error("Error obteniendo productos:", error);
    return res.status(500).json({ message: "Error interno del servidor al obtener los productos." });
  }
};

/**
 * Obtener productos con paginación y filtros
 */
const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, filters, category } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const where = {};

    if (category) {
      where.product_category = category;
    }

    if (filters) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${filters}%` } },
        { sku: { [Op.iLike]: `%${filters}%` } },
        { description: { [Op.iLike]: `%${filters}%` } }
      ];
    }

    const { count, rows } = await Product.findAndCountAll({
      where,
      limit: limitNum,
      offset: offset,
      order: [['createdAt', 'DESC']],
    });

    const totalPages = Math.ceil(count / limitNum) || 1;

    return res.status(200).json({
      products: rows,
      pagination: {
        totalProducts: count,
        totalPages: totalPages,
        currentPage: pageNum,
        limit: limitNum,
      },
    });

  } catch (error) {
    console.error("Error obteniendo productos paginados:", error);
    return res.status(500).json({
      message: "Error interno del servidor al obtener los productos."
    });
  }
};

/**
 * Obtener un producto por ID
 */
const getProduct = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Se requiere un ID para obtener el producto." });
  }

  try {
    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    return res.status(200).json({ product });

  } catch (error) {
    console.error("Error obteniendo producto:", error);
    if (error.name === "SequelizeDatabaseError") {
      return res.status(400).json({ message: "ID de producto no válido." });
    }
    return res.status(500).json({ message: "Error interno del servidor al obtener el producto." });
  }
};

/**
 * Actualizar un producto por ID
 */
const updateProduct = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "No se ha encontrado un ID" });
  }

  const allowedFields = ["sku", "name", "price", "product_category", "description", "front_image"];

  const productData = allowedFields.reduce((acc, field) => {
    if (req.body[field] !== undefined) {
      acc[field] = req.body[field];
    }
    return acc;
  }, {});

  try {
    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    await product.update(productData);

    return res.status(200).json({
      message: "Producto actualizado con éxito",
      product,
    });

  } catch (error) {
    console.error("Error actualizando producto:", error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: "El SKU ya está en uso por otro producto." });
    }

    return res.status(500).json({ message: "Error interno al actualizar producto." });
  }
};

/**
 * Borrar un producto por ID
 */
const deleteProduct = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Se requiere un ID para eliminar el producto." });
  }

  try {
    const deletedRows = await Product.destroy({
      where: { id: id }
    });

    if (deletedRows === 0) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    return res.status(200).json({
      message: "Producto eliminado con éxito",
      deletedProductId: id,
    });

  } catch (error) {
    console.error("Error eliminando producto:", error);
    if (error.name === "SequelizeDatabaseError") {
      return res.status(400).json({ message: "ID de producto no válido." });
    }
    return res.status(500).json({ message: "Error interno del servidor al eliminar el producto." });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
};
