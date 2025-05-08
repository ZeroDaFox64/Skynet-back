const express = require("express");
const {
  loginUser,
  sendOTP,
  verifyOTP,
  changePassword,
  sendResetLink,
  resetPassword,
} = require("../controllers/auth.controller");
const { verifyToken } = require("../middlewares/auth");

const router = express.Router();

router.post("/authentication/login", loginUser); // Iniciar sesión
router.post("/authentication/send-otp", sendOTP); // Enviar OTP
router.post("/authentication/verify-otp", verifyOTP); // Verificar OTP
router.post("/authentication/change-password", verifyToken, changePassword); // Cambiar contraseña
router.post("/authentication/send-reset-link", sendResetLink); // Restablecer contraseña
router.put("/authentication/reset-password", resetPassword); // Cambiar contraseña

module.exports = router;
