const express = require("express");
const router = express.Router();

const {
  createProductCategory,
  getProductCategories,
  getProductCategory,
  updateProductCategory,
  deleteProductCategory,
} = require("../controllers/productCategory.controller");
const { verifyToken, isAdmin } = require("../middlewares/auth");

router.post("/productCategory/register", verifyToken, isAdmin, createProductCategory);
router.get("/productCategory", verifyToken, isAdmin, getProductCategories);
router.get("/productCategory/:id", verifyToken, isAdmin, getProductCategory);
router.put("/productCategory/:id", verifyToken, isAdmin, updateProductCategory);
router.delete("/productCategory/:id", verifyToken, isAdmin, deleteProductCategory);

module.exports = router;