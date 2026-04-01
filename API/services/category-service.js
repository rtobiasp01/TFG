const connectDB = require("../db/mongo");
const { ObjectId } = require("mongodb");

async function getAllCategories() {
  try {
    const db = await connectDB();
    return await db.collection("categories").find({}).toArray();
  } catch (error) {
    console.error("Error al obtener todas las categorías:", error);
    throw new Error("No se pudieron obtener las categorías.");
  }
}

async function createCategory(categoryData) {
  const db = await connectDB();
  const collection = db.collection("categories");

  const result = await collection.insertOne(categoryData);
  return { ...categoryData, _id: result.insertedId };
}

async function deleteCategory(id) {
  try {
    const db = await connectDB();
    const collection = db.collection("categories");

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      throw new Error("No se encontró la categoría para eliminar.");
    }

    return { message: "Categoría eliminada correctamente", id };
  } catch (error) {
    console.error("Error al eliminar la categoría:", error);
    throw error;
  }
}

async function getCategoryById(id) {
  try {
    const db = await connectDB();
    const collection = db.collection("categories");

    return await collection.findOne({ _id: new ObjectId(id) });
  } catch (error) {
    console.error("Error al obtener la categoría:", error);
    throw error;
  }
}

async function updateCategory(id, updateData) {
  try {
    const db = await connectDB();
    const collection = db.collection("categories");

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData },
    );

    if (result.matchedCount === 0) {
      throw new Error("No se encontró la categoría para actualizar.");
    }

    return { message: "Categoría actualizada correctamente", id, ...updateData };
  } catch (error) {
    console.error("Error al actualizar la categoría:", error);
    throw error;
  }
}

module.exports = {
  getAllCategories,
  createCategory,
  deleteCategory,
  getCategoryById,
  updateCategory,
};
