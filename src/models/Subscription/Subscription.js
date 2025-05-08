const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const SubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    required: false,
  },
  nickname: {
    type: String,
    required: false,
  },
  pin: {
    type: String,
    required: false,
  },
  status: {
    type: String,
    required: false,
    enum: ["active", "inactive"],
    default: "active",
  },
  pay_status: {
    type: String,
    required: false,
    enum: ["paid", "canceled", "notified", "unrenewed"],
    default: "paid",
  },
  contract_date: {
    type: String,
    default: Date.now,
    required: true,
  },
  cutoff_date: {
    type: String,
    default: Date.now + 1000 * 60 * 60 * 24 * 30,
    required: true,
  },
  type: {
    type: String,
    required: false,
    enum: ["single", "shared"],
    default: "shared",
  },
  service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
  observations: {
    type: String,
    required: false,
  },
},{
  timestamps: true,
});

SubscriptionSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Subscription", SubscriptionSchema);