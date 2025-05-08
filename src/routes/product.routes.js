const express = require("express");
const router = express.Router();

const { createProduct, getProducts, getProduct, updateProduct, deleteProduct } = require("../controllers/product.controller");
const { verifyToken, isAdmin } = require("../middlewares/auth");

router.post("/product/register", verifyToken, isAdmin, createProduct);
router.get("/product", getProducts);
router.get("/product/:id", getProduct);
router.put("/product/:id", verifyToken, isAdmin, updateProduct);
router.delete("/product/:id", verifyToken, isAdmin, deleteProduct);

module.exports = router;