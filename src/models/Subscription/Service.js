const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const ServiceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  // POR ARREGLAR: Reemplazar por service_category
  category: {
    type: String,
    required: true,
  },
  service_category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ServiceCategory",
    required: false,
  },
  description: {
    type: String,
    required: false,
  },
}, {
  timestamps: true,
});

ServiceSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Service", ServiceSchema);