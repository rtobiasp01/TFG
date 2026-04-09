const connectDB = require("../db/mongo");
const { ObjectId } = require("mongodb");

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

  const result = await collection.insertOne(productData);
  return { ...productData, _id: result.insertedId };
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
  const selectedColor =
    selection.color !== undefined ? String(selection.color).toLowerCase() : null;
  const selectedSize =
    selection.talla !== undefined ? String(selection.talla).toLowerCase() : null;

  if (selectedColor === null && selectedSize === null) {
    return false;
  }

  const variantAttributes = {
    ...(variant.attributes && typeof variant.attributes === "object"
      ? variant.attributes
      : {}),
    ...variant,
  };

  const variantColor =
    variantAttributes.color !== undefined
      ? String(variantAttributes.color).toLowerCase()
      : null;
  const variantSize =
    variantAttributes.talla !== undefined
      ? String(variantAttributes.talla).toLowerCase()
      : null;

  if (selectedColor !== null && variantColor !== selectedColor) {
    return false;
  }

  if (selectedSize !== null && variantSize !== selectedSize) {
    return false;
  }

  return true;
}

async function findProductAndVariantForStockLookup({
  productId,
  productSku,
  variantSku,
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
      variantMatchesSelection(variant, { color, talla }),
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
  color,
  talla,
  quantity = 1,
}) {
  const lookup = await findProductAndVariantForStockLookup({
    productId,
    productSku,
    variantSku,
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
  color,
  talla,
  quantity = 1,
}) {
  const validation = await validateVariantStock({
    productId,
    productSku,
    variantSku,
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

module.exports = {
  getAllProducts,
  createProduct,
  deleteProduct,
  getProductById,
  getProductBySku,
  updateProduct,
  validateVariantStock,
  decrementVariantStock,
};
