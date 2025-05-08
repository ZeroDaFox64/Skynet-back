const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const ProviderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  contact: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
}, {
  timestamps: true,
});

ProviderSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Provider", ProviderSchema);