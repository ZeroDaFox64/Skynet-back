const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  // POR ARREGLAR: hay que reemplazarlo por session_company
  rol: {
    type: String,
    required: true,
  },
  user_tokens: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserToken",
    required: false,
  },
  name: {
    type: String,
    required: false,
  },
  lastname: {
    type: String,
    required: false,
  },
  phone: {
    type: String,
    unique: true,
    required: false,
  },
  shipping_address: {
    type: Object,
    required: false,
  },
  shipping_service: {
    type: Object,
    required: false,
  },
  avatar: {
    type: String,
    required: false,
  },
  observations: {
    type: String,
    required: false,
  },
  user_companies: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "UserCompanies",
    required: false,
  },
  session_company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserCompanies",
    required: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
},
{
  timestamps: true,
});

// Añadir el plugin de paginación
UserSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("User", UserSchema);