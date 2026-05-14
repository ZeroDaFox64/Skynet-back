const express = require("express");
const {
  createCompany,
  getAllCompanies,
  getCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
} = require("../controllers/company.controller");
const { verifyToken, isAdmin } = require("../middlewares/auth");

const router = express.Router();

router.post("/company/register", verifyToken, isAdmin, createCompany);
router.get("/company/all", verifyToken, isAdmin, getAllCompanies);
router.get("/company", verifyToken, isAdmin, getCompanies);
router.get("/company/:id", verifyToken, isAdmin, getCompany);
router.put("/company/:id", verifyToken, isAdmin, updateCompany);
router.delete("/company/:id", verifyToken, isAdmin, deleteCompany);

module.exports = router;
