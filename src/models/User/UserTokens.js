const mongoose = require("mongoose");

const UserTokensSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  session_token: {
    type: String,
    required: false,
  },
  refresh_token: {
    type: String,
    required: false,
  },
  otp_token: {
    type: String,
    required: false,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("UserTokens", UserTokensSchema);
