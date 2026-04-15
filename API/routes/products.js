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

router.get("/sku/:sku", async (req, res) => {
  try {
    const { sku } = req.params;
    const product = await productService.getProductBySku(sku);

    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener producto" });
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

router.post("/validate-stock", async (req, res) => {
  try {
    const result = await productService.validateVariantStock({
      productId: req.body.product_id,
      productSku: req.body.product_sku,
      variantSku: req.body.variant_sku,
      selection: req.body.selection || req.body.attributes || {},
      color: req.body.color,
      talla: req.body.talla,
      quantity: req.body.quantity,
    });

    if (!result.ok) {
      return res.status(409).json(result);
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error al validar stock",
      error: error.message,
    });
  }
});

router.post("/validate-customization", async (req, res) => {
  try {
    const result = await productService.validateProductCustomization({
      productId: req.body.product_id,
      productSku: req.body.product_sku,
      customization: req.body.customization,
    });

    if (!result.valid) {
      return res.status(409).json(result);
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error al validar la personalización",
      error: error.message,
    });
  }
});

router.post("/decrement-stock", async (req, res) => {
  try {
    const result = await productService.decrementVariantStock({
      productId: req.body.product_id,
      productSku: req.body.product_sku,
      variantSku: req.body.variant_sku,
      selection: req.body.selection || req.body.attributes || {},
      color: req.body.color,
      talla: req.body.talla,
      quantity: req.body.quantity,
    });

    if (!result.ok) {
      return res.status(409).json(result);
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error al descontar stock",
      error: error.message,
    });
  }
});

// POST para crear un producto
router.post("/", async function (req, res, next) {
  try {
    const productPayload = {
      ...req.body,
      custom_slug: req.body.custom_slug ?? req.body.slug,
    };
    const newProduct = new Product(productPayload);

    const product = await productService.createProduct(newProduct);

    res.status(201).json({
      success: true,
      message: "Producto creado correctamente",
      data: product,
    });
  } catch (error) {
    if (error?.statusCode === 409) {
      return res.status(409).json({
        success: false,
        message: error.message,
        field: error.field,
        code: error.code,
      });
    }

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

    const existingProduct = await productService.getProductById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    const mergedProductData = {
      ...existingProduct,
      ...req.body,
      custom_slug: req.body.custom_slug ?? req.body.slug ?? existingProduct?.slug ?? null,
    };

    delete mergedProductData._id;

    const normalizedProduct = new Product(mergedProductData);

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
      customization_config:
        req.body.customization_config !== undefined
          ? normalizedProduct.customization_config
          : undefined,
      physical_attributes:
        req.body.physical_attributes !== undefined
          ? normalizedProduct.physical_attributes
          : undefined,
      variantes:
        req.body.variantes !== undefined ? normalizedProduct.variantes : undefined,
      average_rating: req.body.average_rating,
      categoria: req.body.categoria,
      custom_slug: req.body.custom_slug ?? req.body.slug,
      slug:
        req.body.slug !== undefined || req.body.custom_slug !== undefined || req.body.title !== undefined
          ? normalizedProduct.slug
          : undefined,
      image: req.body.image,
      gallery: req.body.gallery,
      visible: req.body.visible,
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
    if (error?.statusCode === 409) {
      return res.status(409).json({
        success: false,
        message: error.message,
        field: error.field,
        code: error.code,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error al actualizar el producto",
      error: error.message,
    });
  }
});

module.exports = router;
