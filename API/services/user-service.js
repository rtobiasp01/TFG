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

async function updateUserProfileData(userId, updates = {}) {
  try {
    if (!ObjectId.isValid(userId)) {
      throw new Error("Invalid user id");
    }

    const db = await connectDB();
    const setPayload = {};

    if (updates.personalData && typeof updates.personalData === "object") {
      Object.entries(updates.personalData).forEach(([key, value]) => {
        setPayload[`personalData.${key}`] = value;
      });
    }

    if (updates.shippingAddress && typeof updates.shippingAddress === "object") {
      Object.entries(updates.shippingAddress).forEach(([key, value]) => {
        setPayload[`shippingAddress.${key}`] = value;
      });
    }

    if (updates.savedPaymentMethod && typeof updates.savedPaymentMethod === "object") {
      // If the existing document has `savedPaymentMethod` set to null,
      // trying to set subfields like `savedPaymentMethod.cardHolder` will
      // fail with MongoServerError (cannot create field in element null).
      // To avoid that, always replace the `savedPaymentMethod` object as
      // a whole when updating it.
      setPayload.savedPaymentMethod = updates.savedPaymentMethod;
    } else if (updates.savedPaymentMethod === null) {
      setPayload.savedPaymentMethod = null;
    }

    if (Object.keys(setPayload).length === 0) {
      return await db.collection("users").findOne({ _id: new ObjectId(userId) });
    }

    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: setPayload },
    );

    return await db.collection("users").findOne({ _id: new ObjectId(userId) });
  } catch (error) {
    console.error(`Error al actualizar datos del usuario: ${userId}`, error);
    throw error;
  }
}

async function deleteUserById(userId) {
  try {
    if (!ObjectId.isValid(userId)) {
      throw new Error("Invalid user id");
    }

    const db = await connectDB();
    const result = await db.collection("users").deleteOne({ _id: new ObjectId(userId) });

    return result.deletedCount > 0;
  } catch (error) {
    console.error(`Error al eliminar usuario: ${userId}`, error);
    throw new Error("No se pudo eliminar el usuario.");
  }
}

async function setResetTokenByEmail(email, resetToken, resetTokenExpiry) {
  try {
    const db = await connectDB();
    return await db.collection("users").updateOne(
      { email },
      {
        $set: {
          resetToken,
          resetTokenExpiry,
        },
      },
    );
  } catch (error) {
    console.error(`Error al establecer token de recuperación para: ${email}`, error);
    throw new Error("No se pudo establecer el token de recuperación.");
  }
}

async function findUserByResetToken(resetToken) {
  try {
    const db = await connectDB();
    return await db.collection("users").findOne({
      resetToken,
      resetTokenExpiry: { $gt: new Date() },
    });
  } catch (error) {
    console.error(`Error al buscar usuario por token de recuperación`, error);
    throw new Error("No se pudo buscar el usuario por token de recuperación.");
  }
}

async function clearResetToken(userId) {
  try {
    if (!ObjectId.isValid(userId)) {
      throw new Error("Invalid user id");
    }

    const db = await connectDB();
    return await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $unset: {
          resetToken: "",
          resetTokenExpiry: "",
        },
      },
    );
  } catch (error) {
    console.error(`Error al limpiar token de recuperación para: ${userId}`, error);
    throw new Error("No se pudo limpiar el token de recuperación.");
  }
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  setUserAdminByEmail,
  getAllUsers,
  updateUserProfileData,
  deleteUserById,
  setResetTokenByEmail,
  findUserByResetToken,
  clearResetToken,
};
