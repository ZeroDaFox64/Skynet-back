const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const AccountSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    contract_date: {
      type: String,
      required: true,
    },
    cutoff_date: {
      type: String,
      required: true,
    },
    // POR ARREGLAR: Deveria llamarse subscriptions
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
      },
    ],
    type: {
      type: String,
      required: false,
      enum: ["single", "shared"],
      default: "shared",
    },
    status: {
      type: String,
      required: false,
      enum: ["expired", "under_review", "available"],
      default: "available",
    },
    availability: {
      type: String,
      required: false,
      enum: ["full", "partial", "empty"],
      default: "empty",
    },
    maintenance: {
      type: String,
      required: false,
      default: 'false',
    },
    observations: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

AccountSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Account", AccountSchema);
