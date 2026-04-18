const connectDB = require("../db/mongo");
const { ObjectId } = require("mongodb");

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

// Buscar un usuario por id
async function findUserById(id) {
  try {
    const db = await connectDB();
    return await db.collection("users").findOne({ _id: new ObjectId(id) });
  } catch (error) {
    console.error(`Error al buscar el usuario por id: ${id}`, error);
    throw new Error("No se pudo buscar el usuario por id.");
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

// Actualizar el rol admin de un usuario por email
async function setUserAdminByEmail(email, isAdmin) {
  try {
    const db = await connectDB();
    return await db.collection("users").updateOne(
      { email },
      {
        $set: {
          isAdmin: Boolean(isAdmin),
        },
      },
    );
  } catch (error) {
    console.error(`Error al actualizar rol admin del usuario: ${email}`, error);
    throw new Error("No se pudo actualizar el rol del usuario.");
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
  findUserById,
  createUser,
  setUserAdminByEmail,
  getAllUsers,
};
