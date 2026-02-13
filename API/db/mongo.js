const { MongoClient } = require("mongodb");

const uri =
  process.env.MONGO_URI || "mongodb://admin:admin1234@localhost:27017";
const client = new MongoClient(uri);

let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.DATABASE_NAME || "mydatabase");
    console.log("MongoDB conectado");
  }
  return db;
}

async function closeDB() {
  if (client) {
    await client.close();
    console.log("MongoDB desconectado");
  }
}

module.exports = connectDB;
