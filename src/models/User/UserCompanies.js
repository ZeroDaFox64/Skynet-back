const mongoose = require("mongoose");

const UserCompaniesSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  role_permission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("UserCompanies", UserCompaniesSchema);
