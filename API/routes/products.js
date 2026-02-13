const express = require("express");
const productService = require("../services/product-service");
const middlewareAuth = require("../middlewares/authMiddleware");
const Product = require("../models/products");

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

router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const product = await productService.deleteProduct(id);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar producto" });
  }
});

// POST para crear un producto
router.post('/', async function (req, res, next) {
  try {
    const { title,
      description,
      short_description,
      price,
      sale_price,
      sku,
      stock_status,
      stock_quantity,
      manage_stock,
      type,
      dim_l,
      dim_w,
      dim_h,
      weight,
      average_rating,
      custom_slug } = req.body;

    const newProduct = new Product(
      title,
      description,
      short_description,
      price,
      sale_price,
      sku,
      stock_status,
      stock_quantity,
      manage_stock,
      type,
      dim_l,
      dim_w,
      dim_h,
      weight,
      average_rating,
      custom_slug
    );

    const product = await productService.createProduct(newProduct);

    res.status(201).json({
      success: true,
      message: "Producto creado correctamente",
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al crear el producto",
      error: error.message
    });
  }
});


module.exports = router;
