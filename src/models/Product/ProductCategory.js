const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const ProductCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: false,
  },
}, {
  timestamps: true,
});

ProductCategorySchema.plugin(mongoosePaginate);

module.exports = mongoose.model("ProductCategory", ProductCategorySchema);
