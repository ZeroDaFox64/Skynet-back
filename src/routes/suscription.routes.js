const express = require("express");
const router = express.Router();

const {
  createSubscription,
  getSubscriptions,
  getUserSubscriptions,
  getSubscription,
  updateSubscription,
  deleteSubscription,
  migrateSubscription,
} = require("../controllers/subscription.controller");
const { verifyToken, isAdmin } = require("../middlewares/auth");

router.get("/subscription", verifyToken, isAdmin, getSubscriptions);
router.get("/subscription/user/:id", verifyToken, getUserSubscriptions);
router.get("/subscription/:id", verifyToken, isAdmin, getSubscription);
router.post("/subscription/register", verifyToken, isAdmin, createSubscription);
router.put("/subscription/:id", verifyToken, isAdmin, updateSubscription);
router.delete("/subscription/:id", verifyToken, isAdmin, deleteSubscription);
router.put("/subscription/migrate/:id", verifyToken, isAdmin, migrateSubscription);

module.exports = router;