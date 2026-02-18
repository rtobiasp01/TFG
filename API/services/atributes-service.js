const connectDB = require("../db/mongo");
const { ObjectId } = require("mongodb");

async function getAll() {
    try {
        const db = await connectDB();
        return await db.collection("atributes").find({}).toArray();
    } catch (error) {
        throw new Error("Error al obtener los atributos");
    }
}

async function insertOne(data) {
    try {
        const db = await connectDB();
        const collection = await db.collection("atributes");

        const response = await collection.insertOne(data);

        return { ...data, _id: response.insertedId };

    } catch (error) {
        throw error;
    }
}

async function getByName(atribute_name) {
    try {
        const db = await connectDB();
        const regex = new RegExp(`^${atribute_name}`, 'i');

        return await db.collection("atributes").find({ nombre: regex }).toArray();
    } catch (error) {
        throw error;
    }
}

async function deleteOne(id) {
    try {
        const db = await connectDB();
        return await db.collection("atributes").deleteOne({ _id: new ObjectId(id) });
    } catch (error) {
        throw error;
    }
}

module.exports = {
    getAll,
    insertOne,
    getByName,
    deleteOne
};