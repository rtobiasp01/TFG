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

module.exports = {
  getAllProducts,
  createProduct,
  deleteProduct,
  getProductById,
  updateProduct,
};
