const connectDB = require("../db/mongo");

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
};

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

module.exports = {
  getAllProducts,
  createProduct,
  deleteProduct,
};
