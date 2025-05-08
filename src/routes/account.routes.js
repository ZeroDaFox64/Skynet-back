const express = require("express");
const { 
    createAccount,
    getAllAccounts,
    getAccounts, 
    getAccount,
    updateAccount,
    deleteAccount,
    migrateAccountUsers,
 } = require("../controllers/account.controller");
const { verifyToken, isAdmin } = require("../middlewares/auth");

const router = express.Router();

router.post("/account/register", verifyToken, isAdmin, createAccount); // Registrar una cuenta
router.get("/account/all", verifyToken, isAdmin, getAllAccounts); // Obtener todas las cuentas
router.get("/account", verifyToken, isAdmin, getAccounts); // Obtener todas las cuentas
router.get("/account/:id", verifyToken, isAdmin, getAccount); // Obtener una cuenta
router.put("/account/:id", verifyToken, isAdmin, updateAccount); // Actualizar una cuenta
router.delete("/account/:id", verifyToken, isAdmin, deleteAccount); // Eliminar una cuenta
router.post("/account/migrate/:id", verifyToken, isAdmin, migrateAccountUsers); // Migrar usuarios de una cuenta a otra

module.exports = router;
