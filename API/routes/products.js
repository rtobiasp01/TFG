const express = require("express");
const productService = require("../services/product-service");
const middlewareAuth = require("../middlewares/authMiddleware");

const router = express.Router();

// GET /api/products
router.get("/", async (req, res) => {
  try {
    const products = await productService.getAllProducts();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// POST /api/products
router.post("/", middlewareAuth, async (req, res) => {
  try {
    const { name, price } = req.body;
    const newProduct = await productService.createProduct({ name, price });
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: "Error al crear producto" });
  }
});

module.exports = router;
