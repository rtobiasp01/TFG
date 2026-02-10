const connectDB = require("../db/mongo");

// Buscar un usuario por email
async function findUserByEmail(email) {
  try {
    const db = await connectDB();
    return await db.collection("users").findOne({ email });
  } catch (error) {
    console.error(`Error al buscar el usuario por email: ${email}`, error);
    throw new Error("No se pudo buscar el usuario.");
  }
}

// Crear un nuevo usuario
async function createUser(user) {
  try {
    const db = await connectDB();
    return await db.collection("users").insertOne(user);
  } catch (error) {
    console.error("Error al crear el usuario:", error);
    throw new Error("No se pudo crear el usuario.");
  }
}

// Obtener todos los usuarios
async function getAllUsers() {
  try {
    const db = await connectDB();
    return await db.collection("users").find({}).toArray();
  } catch (error) {
    console.error("Error al obtener todos los usuarios:", error);
    throw new Error("No se pudieron obtener los usuarios.");
  }
}

module.exports = {
  findUserByEmail,
  createUser,
  getAllUsers,
};
