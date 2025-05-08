const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const ProductSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  stock: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Stock",
    required: false, // va en true
  },
  discount: {
    type: Number,
    required: false,
  },
  product_category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProductCategory",
    required: true,
  },
  genre: {
    type: String,
    required: false,
  },
  description: {
    type: String,
    required: false,
  },
  front_image: {
    type: String,
    required: false,
  },
  images: {
    type: Array,
    required: false,
  },
  link_mercadolibre: {
    type: String,
    required: false,
  },
  // company: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: "Company",
  //   required: true,
  // },
  features: {
    type: Array,
    required: false,
  },
}, {
  timestamps: true,
});

ProductSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Product", ProductSchema);
