const express = require("express");
const {
  getCharts,
} = require("../controllers/charts.controller");

const router = express.Router();

router.get("/charts", getCharts); // Obtener gráficos

module.exports = router;
