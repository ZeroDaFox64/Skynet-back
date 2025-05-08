const mongoose = require("mongoose");

const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  permissions: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Permission",
    required: true,
  },
  is_root: {
    type: Boolean,
    unique: true,
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("Role", RoleSchema);