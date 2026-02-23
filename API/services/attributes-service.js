const connectDB = require("../db/mongo");
const { ObjectId } = require("mongodb");

async function getAll() {
  try {
    const db = await connectDB();
    return await db.collection("attributes").find({}).toArray();
  } catch (error) {
    throw new Error("Error al obtener los atributos");
  }
}

async function insertOne(data) {
  try {
    const db = await connectDB();
    const collection = await db.collection("attributes");

    const response = await collection.insertOne(data);

    return { ...data, _id: response.insertedId };
  } catch (error) {
    throw error;
  }
}

const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function getByName(attribute_name) {
  const db = await connectDB();

  const safeInput = escapeRegExp(attribute_name);
  const regex = new RegExp(`^${safeInput}`, "i");

  try {
    return await db.collection("attributes").find({ name: regex }).toArray();
  } catch (error) {
    console.error("Database query failed:", error);
    throw error;
  }
}

async function insertValue(id, value) {
  const db = await connectDB();
  const collection = await db.collection("attributes");

  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    { $push: { values: value } },
  );
  return result;
}

async function deleteOne(id) {
  try {
    const db = await connectDB();
    return await db
      .collection("attributes")
      .deleteOne({ _id: new ObjectId(id) });
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getAll,
  insertOne,
  getByName,
  deleteOne,
  insertValue,
};
