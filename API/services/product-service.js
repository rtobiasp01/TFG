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

// Crear un nuevo producto
async function createProduct(product) {
  try {
    const db = await connectDB();
    return await db.collection("products").insertOne(product);
  } catch (error) {
    console.error("Error al crear el producto:", error);
    throw new Error("No se pudo crear el producto.");
  }
}

module.exports = {
  getAllProducts,
  createProduct,
};
