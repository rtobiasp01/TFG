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

router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const product = await productService.getProductById(id);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener producto" });
  }
});

// POST para crear un producto
router.post("/", async function (req, res, next) {
  try {
    const {
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
      custom_slug,
      image,
    } = req.body;

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
      custom_slug,
      image,
    );

    const product = await productService.createProduct(newProduct);

    res.status(201).json({
      success: true,
      message: "Producto creado correctamente",
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al crear el producto",
      error: error.message,
    });
  }
});

// PUT /api/products/:id - Actualizar un producto
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const updateData = {
      title: req.body.title,
      description: req.body.description,
      short_description: req.body.short_description,
      price: req.body.price,
      sale_price: req.body.sale_price,
      sku: req.body.sku,
      stock_status: req.body.stock_status,
      stock_quantity: req.body.stock_quantity,
      manage_stock: req.body.manage_stock,
      type: req.body.type,
      dim_l: req.body.dim_l,
      dim_w: req.body.dim_w,
      dim_h: req.body.dim_h,
      weight: req.body.weight,
      average_rating: req.body.average_rating,
      custom_slug: req.body.custom_slug,
      image: req.body.image,
    };

    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    const updatedProduct = await productService.updateProduct(id, updateData);

    res.json({
      success: true,
      message: "Producto actualizado correctamente",
      data: updatedProduct,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar el producto",
      error: error.message,
    });
  }
});

module.exports = router;
