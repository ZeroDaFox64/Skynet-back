const express = require("express");
const router = express.Router();

const {
  createService,
  getServices,
  getService,
  updateService,
  deleteService,
} = require("../controllers/service.controller");
const { verifyToken, isAdmin } = require("../middlewares/auth");

router.post("/service/register", verifyToken, isAdmin, createService);
router.get("/service", verifyToken, isAdmin, getServices);
router.get("/service/:id", verifyToken, isAdmin, getService);
router.put("/service/:id", verifyToken, isAdmin, updateService);
router.delete("/service/:id", verifyToken, isAdmin, deleteService);

module.exports = router;