const ProductCategory = require("../models/Product/ProductCategory");
const { paginate } = require("../config/utils");

const createProductCategory = async (req, res) => {
    const { name, description } = req.body;

    // Validar que el nombre esté presente
    if (!name) {
        return res.status(400).json({ message: "El nombre del proveedor es requerido." });
    }

    try {
        // Verificar si el nombre del proveedor ya está en uso
        const isTaken = await ProductCategory.findOne({ name: name });
        if (isTaken) {
            return res.status(400).json({ message: "Este nombre ya está en uso." });
        }

        // Crear el objeto de datos del proveedor
        const productCategoryData = {
            name,
            description: description || null, // Valor por defecto si no se proporciona
        };

        // Crear y guardar el nuevo proveedor
        const productCategory = new ProductCategory(productCategoryData);
        await productCategory.save();

        // Respuesta exitosa
        return res.status(201).json({
            message: "Categoría creada con éxito.",
            productCategory,
        });
    } catch (error) {
        console.error("Error creando la categoría:", error);

        // Manejar errores específicos
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: "Error de validación.", details: error.message });
        }

        // Error genérico del servidor
        return res.status(500).json({ message: "Error interno del servidor al crear la categoría." });
    }
};

const getProductCategories = async (req, res) => {
    try {
        const { page = 1, limit = 20, filters } = req.query;

        // Construir el objeto de filtrado
        const filterQuery = {};

        if (filters) {
            // Crear un array con las propiedades del modelo ProductCategory que deseas buscar
            const searchableFields = [
                "name",
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
        const result = await paginate(ProductCategory, filterQuery, { page, limit });

        // Respuesta exitosa
        return res.status(200).json({
            productCategories: result.docs,
            pagination: {
                totalProductCategories: result.totalDocs,
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
        return res.status(500).json({ message: "Error interno del servidor al obtener las categorías de productos." });
    }
};

const getProductCategory = async (req, res) => {
    const { id } = req.params;

    // Validar que el ID esté presente
    if (!id) {
        return res.status(400).json({ message: "Se requiere un ID de categoría de producto." });
    }

    try {
        // Buscar el proveedor por ID
        const productCategory = await ProductCategory.findOne({ _id: id });

        // Verificar si el proveedor existe
        if (!productCategory) {
            return res.status(404).json({ message: "Categoría de producto no encontrada." });
        }

        // Respuesta exitosa
        return res.status(200).json({
            message: "Categoría de producto obtenida con éxito.",
            productCategory,
        });
    } catch (error) {
        console.error("Error obteniendo categoría de producto:", error);

        // Manejar errores específicos
        if (error.name === "CastError") {
            return res.status(400).json({ message: "ID de categoría de producto no válido." });
        }

        // Error genérico del servidor
        return res.status(500).json({ message: "Error interno del servidor al obtener la categoría de producto." });
    }
};

const updateProductCategory = async (req, res) => {
    const { name, description } = req.body;
    const { id } = req.params;

    // Validar que el ID esté presente
    if (!id) {
        return res.status(400).json({ message: "Se requiere un ID de categoría de producto." });
    }

    // Validar que al menos un campo esté presente para actualizar
    if (!name && !description) {
        return res.status(400).json({ message: "Se requiere al menos un campo para actualizar." });
    }

    try {
        // Buscar el proveedor por ID
        const productCategory = await ProductCategory.findOne({ _id: id });

        // Verificar si el proveedor existe
        if (!productCategory) {
            return res.status(404).json({ message: "Categoría de producto no encontrada." });
        }

        // Crear el objeto de datos del proveedor
        const productCategoryData = {};
        if (name) productCategoryData.name = name;
        if (description) productCategoryData.description = description;

        // Actualizar el proveedor
        const updatedProductCategory = await ProductCategory.findOneAndUpdate(
            { _id: id },
            productCategoryData,
            { new: true } // Devuelve el documento actualizado
        );

        // Verificar si la actualización fue exitosa
        if (!updatedProductCategory) {
            return res.status(400).json({ message: "Error al actualizar la categoría de producto." });
        }

        // Respuesta exitosa
        return res.status(200).json({
            message: "Categoría de producto actualizada con éxito.",
            productCategory: {
                id: updatedProductCategory._id,
                name: updatedProductCategory.name,
                description: updatedProductCategory.description,
            },
        });
    } catch (error) {
        console.error("Error actualizando categoría de producto:", error);

        // Manejar errores específicos
        if (error.name === "CastError") {
            return res.status(400).json({ message: "ID de categoría de producto no válido." });
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({ message: "Error de validación.", details: error.message });
        }

        // Error genérico del servidor
        return res.status(500).json({ message: "Error interno del servidor al actualizar la categoría de producto." });
    }
};

const deleteProductCategory = async (req, res) => {
    const { id } = req.params;

    // Validar que el ID esté presente
    if (!id) {
        return res.status(400).json({ message: "Se requiere un ID de categoría de producto." });
    }

    try {
        // Buscar y eliminar el proveedor por ID
        const deletedProductCategory = await ProductCategory.findOneAndDelete({ _id: id });

        // Verificar si el proveedor fue encontrado y eliminado
        if (!deletedProductCategory) {
            return res.status(404).json({ message: "Categoría de producto no encontrada." });
        }

        // Respuesta exitosa
        return res.status(200).json({
            message: "Categoría de producto eliminada con éxito.",
            deletedProductCategoryId: deletedProductCategory._id, // Devolver el ID de la categoría de producto eliminada
        });
    } catch (error) {
        console.error("Error eliminando categoría de producto:", error);

        // Manejar errores específicos
        if (error.name === "CastError") {
            return res.status(400).json({ message: "ID de categoría de producto no válido." });
        }

        // Error genérico del servidor
        return res.status(500).json({ message: "Error interno del servidor al eliminar la categoría de producto." });
    }
};

module.exports = {
    createProductCategory,
    getProductCategories,
    getProductCategory,
    updateProductCategory,
    deleteProductCategory,
};