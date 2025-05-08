const express = require("express");
const router = express.Router();

const {
  createProvider,
  getProviders,
  getProvider,
  updateProvider,
  deleteProvider,
} = require("../controllers/provider.controller");
const { verifyToken, isAdmin } = require("../middlewares/auth");

router.post("/provider/register", verifyToken, isAdmin, createProvider);
router.get("/provider", verifyToken, isAdmin, getProviders);
router.get("/provider/:id", verifyToken, isAdmin, getProvider);
router.put("/provider/:id", verifyToken, isAdmin, updateProvider);
router.delete("/provider/:id", verifyToken, isAdmin, deleteProvider);

module.exports = router;