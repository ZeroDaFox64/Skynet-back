const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema({
  rif: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  pay_status: {
    type: String,
    required: true,
  },
  company_settings: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CompanySettings",
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("Company", CompanySchema);