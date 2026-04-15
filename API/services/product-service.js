const connectDB = require("../db/mongo");
const { ObjectId } = require("mongodb");

class ProductConflictError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "ProductConflictError";
    this.statusCode = 409;
    this.code = "PRODUCT_DUPLICATE";
    this.field = field;
  }
}

function normalizePrimitiveValue(value) {
  if (value === undefined || value === null) {
    return null;
  }

  return String(value).trim().toLowerCase();
}

function getVariantAttributes(variant) {
  const explicitAttributes =
    variant.attributes && typeof variant.attributes === "object" && !Array.isArray(variant.attributes)
      ? variant.attributes
      : {};

  const reservedKeys = new Set([
    "sku",
    "stock",
    "stock_quantity",
    "precio_adicional",
    "imagenes",
    "physical_attributes",
    "attributes",
    "_id",
  ]);

  const mergedAttributes = { ...explicitAttributes };

  Object.entries(variant).forEach(([key, value]) => {
    if (reservedKeys.has(key) || mergedAttributes[key] !== undefined) {
      return;
    }

    mergedAttributes[key] = value;
  });

  const normalizedAttributes = {};

  Object.entries(mergedAttributes).forEach(([key, value]) => {
    if (typeof value === "string" || typeof value === "number") {
      normalizedAttributes[key] = normalizePrimitiveValue(value);
      return;
    }

    if (Array.isArray(value)) {
      const firstPrimitiveValue = value.find(
        (item) => typeof item === "string" || typeof item === "number",
      );

      if (firstPrimitiveValue !== undefined) {
        normalizedAttributes[key] = normalizePrimitiveValue(firstPrimitiveValue);
      }
    }
  });

  return normalizedAttributes;
}

// Obtener todos los productos
async function getAllProducts() {
  try {
    const db = await connectDB();
    return await db.collection("products").find({}).toArray();
  } catch (error) {
    console.error("Error al obtener todos los productos:", error);
    throw new Error("No se pudieron obtener los productos.");
  }
}

async function createProduct(productData) {
  const db = await connectDB();
  const collection = db.collection("products");

  await validateUniqueProductIdentifiers({
    sku: productData?.sku,
    slug: productData?.slug,
  });

  const result = await collection.insertOne(productData);
  return { ...productData, _id: result.insertedId };
}

async function validateUniqueProductIdentifiers({ sku, slug, excludeProductId } = {}) {
  const db = await connectDB();
  const collection = db.collection("products");
  const exclusionFilter = excludeProductId
    ? { _id: { $ne: new ObjectId(excludeProductId) } }
    : {};

  const normalizedSku = typeof sku === "string" ? sku.trim() : "";
  const normalizedSlug = typeof slug === "string" ? slug.trim() : "";

  if (normalizedSku.length > 0) {
    const existingBySku = await collection.findOne({
      sku: normalizedSku,
      ...exclusionFilter,
    });

    if (existingBySku) {
      throw new ProductConflictError(
        `Ya existe un producto con el SKU "${normalizedSku}".`,
        "sku",
      );
    }
  }

  if (normalizedSlug.length > 0) {
    const existingBySlug = await collection.findOne({
      slug: normalizedSlug,
      ...exclusionFilter,
    });

    if (existingBySlug) {
      throw new ProductConflictError(
        `Ya existe un producto con el slug "${normalizedSlug}".`,
        "slug",
      );
    }
  }

  return { valid: true };
}

async function deleteProduct(id) {
  try {
    const db = await connectDB();
    const collection = db.collection("products");

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      throw new Error("No se encontró el producto para eliminar.");
    }

    return { message: "Producto eliminado correctamente", id };
  } catch (error) {
    console.error("Error al eliminar el producto:", error);
    throw error;
  }
}

async function getProductById(id) {
  try {
    const db = await connectDB();
    const collection = db.collection("products");

    return await collection.findOne({ _id: new ObjectId(id) });
  } catch (error) {
    console.error("Error al obtener el producto:", error);
    throw error;
  }
}

async function getProductBySku(sku) {
  try {
    const db = await connectDB();
    const collection = db.collection("products");

    return await collection.findOne({ sku });
  } catch (error) {
    console.error("Error al obtener el producto por SKU:", error);
    throw error;
  }
}

async function updateProduct(id, updateData) {
  try {
    const db = await connectDB();
    const collection = db.collection("products");

    await validateUniqueProductIdentifiers({
      sku: updateData?.sku,
      slug: updateData?.slug,
      excludeProductId: id,
    });

    // Usamos $set para actualizar solo los campos enviados en updateData
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData },
    );

    if (result.matchedCount === 0) {
      throw new Error("No se encontró el producto para actualizar.");
    }

    return { message: "Producto actualizado correctamente", id, ...updateData };
  } catch (error) {
    console.error("Error al actualizar el producto:", error);
    throw error;
  }
}

function variantMatchesSelection(variant, selection = {}) {
  const normalizedSelection = Object.entries(selection).reduce((accumulator, [key, value]) => {
    const normalizedValue = normalizePrimitiveValue(value);

    if (normalizedValue !== null) {
      accumulator[key] = normalizedValue;
    }

    return accumulator;
  }, {});

  if (Object.keys(normalizedSelection).length === 0) {
    return false;
  }

  const variantAttributes = getVariantAttributes(variant);

  return Object.entries(normalizedSelection).every(
    ([key, value]) => variantAttributes[key] === value,
  );
}

async function findProductAndVariantForStockLookup({
  productId,
  productSku,
  variantSku,
  selection = {},
  color,
  talla,
}) {
  const db = await connectDB();
  const collection = db.collection("products");

  let product = null;

  if (productId) {
    product = await collection.findOne({ _id: new ObjectId(productId) });
  } else if (productSku) {
    product = await collection.findOne({ sku: productSku });
  } else if (variantSku) {
    product = await collection.findOne({ "variantes.sku": variantSku });
  }

  if (!product) {
    return null;
  }

  const variants = Array.isArray(product.variantes) ? product.variantes : [];

  let variantIndex = -1;

  if (variantSku) {
    variantIndex = variants.findIndex((variant) => variant.sku === variantSku);
  } else {
    variantIndex = variants.findIndex((variant) =>
      variantMatchesSelection(variant, {
        ...selection,
        ...(color !== undefined ? { color } : {}),
        ...(talla !== undefined ? { talla } : {}),
      }),
    );
  }

  if (variantIndex < 0) {
    return { product, variant: null, variantIndex: -1 };
  }

  return {
    product,
    variant: variants[variantIndex],
    variantIndex,
  };
}

async function validateVariantStock({
  productId,
  productSku,
  variantSku,
  selection = {},
  color,
  talla,
  quantity = 1,
}) {
  const lookup = await findProductAndVariantForStockLookup({
    productId,
    productSku,
    variantSku,
    selection,
    color,
    talla,
  });

  if (!lookup || !lookup.product) {
    return {
      ok: false,
      reason: "PRODUCT_NOT_FOUND",
    };
  }

  if (!lookup.variant) {
    return {
      ok: false,
      reason: "VARIANT_NOT_FOUND",
      productId: lookup.product._id,
    };
  }

  const requestedQuantity = Number.parseInt(quantity, 10) || 1;
  const availableStock = Number.parseInt(lookup.variant.stock_quantity, 10) || 0;

  return {
    ok: availableStock >= requestedQuantity,
    reason: availableStock >= requestedQuantity ? null : "INSUFFICIENT_STOCK",
    productId: lookup.product._id,
    variantSku: lookup.variant.sku,
    availableStock,
    requestedQuantity,
  };
}

async function decrementVariantStock({
  productId,
  productSku,
  variantSku,
  selection = {},
  color,
  talla,
  quantity = 1,
}) {
  const validation = await validateVariantStock({
    productId,
    productSku,
    variantSku,
    selection,
    color,
    talla,
    quantity,
  });

  if (!validation.ok) {
    return validation;
  }

  const db = await connectDB();
  const collection = db.collection("products");
  const requestedQuantity = Number.parseInt(quantity, 10) || 1;

  const filter = {
    _id: new ObjectId(validation.productId),
    "variantes.sku": validation.variantSku,
    "variantes.stock_quantity": { $gte: requestedQuantity },
  };

  const update = {
    $inc: {
      "variantes.$.stock_quantity": -requestedQuantity,
    },
  };

  const result = await collection.updateOne(filter, update);

  if (result.modifiedCount === 0) {
    return {
      ok: false,
      reason: "INSUFFICIENT_STOCK",
      variantSku: validation.variantSku,
    };
  }

  const refreshed = await collection.findOne(
    { _id: new ObjectId(validation.productId), "variantes.sku": validation.variantSku },
    {
      projection: {
        "variantes.$": 1,
      },
    },
  );

  const remainingStock = Number.parseInt(
    refreshed?.variantes?.[0]?.stock_quantity,
    10,
  ) || 0;

  return {
    ok: true,
    variantSku: validation.variantSku,
    remainingStock,
  };
}

async function validateProductCustomization({
  productId,
  productSku,
  customization = {},
}) {
  const db = await connectDB();
  const collection = db.collection("products");

  let product = null;

  if (productId) {
    product = await collection.findOne({ _id: new ObjectId(productId) });
  } else if (productSku) {
    product = await collection.findOne({ sku: productSku });
  }

  if (!product) {
    return {
      valid: false,
      errors: ["PRODUCT_NOT_FOUND"],
    };
  }

  const config = product.customization_config || {
    allowImage: true,
    enableBackgroundRemoval: true,
    allowText: true,
    maxImageSize: 5242880,
    maxTextLength: 200,
    imageFormats: ["jpg", "jpeg", "png", "webp"],
    textPlaceholder: "Escribe un mensaje personalizado",
  };

  const errors = [];
  const customText = typeof customization.customText === "string" ? customization.customText.trim() : "";
  const uploadedImageUrl =
    typeof customization.uploadedImageUrl === "string"
      ? customization.uploadedImageUrl.trim()
      : "";

  if (uploadedImageUrl) {
    if (!config.allowImage) {
      errors.push("IMAGE_NOT_ALLOWED");
    }

    const imageExtension = uploadedImageUrl.split("?")[0].split(".").pop().toLowerCase();
    const allowedFormatsFromConfig = Array.isArray(config.imageFormats)
      ? config.imageFormats.map((format) => String(format).toLowerCase())
      : [];
    const allowedFormats =
      config.enableBackgroundRemoval === false ? ["png"] : allowedFormatsFromConfig;

    if (allowedFormats.length > 0 && !allowedFormats.includes(imageExtension)) {
      errors.push("IMAGE_FORMAT_NOT_ALLOWED");
    }
  }

  if (customText) {
    if (!config.allowText) {
      errors.push("TEXT_NOT_ALLOWED");
    }

    if (customText.length > Number(config.maxTextLength || 0)) {
      errors.push("TEXT_TOO_LONG");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    productId: product._id,
  };
}

module.exports = {
  getAllProducts,
  createProduct,
  validateUniqueProductIdentifiers,
  deleteProduct,
  getProductById,
  getProductBySku,
  updateProduct,
  validateVariantStock,
  decrementVariantStock,
  validateProductCustomization,
};
