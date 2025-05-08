const Product = require("../models/Product/Product");
const Stock = require("../models/Product/Stock");
const AWS = require("aws-sdk");
const { str10_36 } = require("hyperdyperid/lib/str10_36");

const spacesEndpoint = new AWS.Endpoint(process.env.ENDPOINT);

const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.SPACES_KEY,
  secretAccessKey: process.env.SPACES_SECRET,
});

const createProduct = async (req, res) => {
  // Extraer campos de texto del body
  const {
    sku,
    name,
    price,
    discount,
    product_category,
    link_mercadolibre,
    genre,
    description,
    features,
  } = req.body;

  // Procesar archivos subidos
  const files = req.files || {};

  const maxSize = 5 * 1024 * 1024; // 5 MB
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"]; // Tipos de archivos permitidos

  const idFrontImage = str10_36(); // Generar un ID aleatorio para la imagen

  try {
    // Subir las imagenes nuevo
    await s3
    .putObject({
      ACL: "public-read",
      Bucket: process.env.BUCKET_NAME,
      Body: files['front_image'].data,
      Key: `products/${idFrontImage}`,
    })
    .promise();

    const uploadImages = files['images'].map(async (image) => {
      const idImage = str10_36();
      
      await s3.putObject({
        ACL: "public-read",
        Bucket: process.env.BUCKET_NAME,
        Body: image.data,
        Key: `products/${idImage}`,
      }).promise();
    
      return `https://${process.env.BUCKET_NAME}.${process.env.ENDPOINT}/products/${idImage}`;
    });
    
    const productImages = await Promise.all(uploadImages);

    const urlFrontImage = `https://${process.env.BUCKET_NAME}.${process.env.ENDPOINT}/products/${idFrontImage}`;

    // Crear el producto
    const product = new Product({
      sku,
      name,
      price,
      discount,
      product_category,
      genre,
      front_image: urlFrontImage,
      images: productImages,
      link_mercadolibre,
      description,
      features,
    });

    // Crear el stock asociado
    const stock = new Stock({
      product: product._id,
      quantity: 0,
    });
    
    await stock.save();
    product.stock = stock._id;
    
    // Guardar el producto
    const savedProduct = await product.save();
    
    res.status(201).json({ 
      message: "Producto creado exitosamente",
      product: savedProduct
    });
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ 
      message: "Error al crear el producto",
      error: error.message 
    });
  }
};
const getProducts = async (req, res) => {
  try {
    const products = await Product.find().populate("product_category");
    res.status(200).json({ products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    res.status(200).json({ product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    // await Product.findByIdAndUpdate(req.params.id, req.body)
    res.status(200).json({ message: "Producto actualizado exitosamente" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Producto eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
};
