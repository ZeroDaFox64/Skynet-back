const express = require("express");
const {
  registerUser,
  getAllUsers,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  uploadAvatar,
} = require("../controllers/user.controller");
const { verifyToken, isAdmin } = require("../middlewares/auth");

const router = express.Router();

router.post("/user/register", registerUser); // Registrar usuario
router.get("/user/all", verifyToken, isAdmin, getAllUsers); // Obtener todos los usuarios
router.get("/user", verifyToken, isAdmin, getUsers); // Obtener todos los usuarios paginados
router.get("/user/:id", verifyToken, getUser); // Obtener un usuario
router.put("/user/:id", verifyToken, updateUser); // Actualizar usuario
router.delete("/user/:id", verifyToken, isAdmin, deleteUser); // Borrar usuario
router.post("/user/avatar/:id", verifyToken, uploadAvatar); // Subir avatar

module.exports = router;
