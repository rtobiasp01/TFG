const { MongoClient } = require("mongodb");

const uri =
  process.env.MONGO_URI || "mongodb://admin:admin1234@localhost:27017";
const client = new MongoClient(uri);

let db;
let indexesEnsured = false;

async function ensureIndexes(database) {
  if (indexesEnsured) {
    return;
  }

  const products = database.collection("products");

  try {
    await products.createIndex(
      { sku: 1 },
      {
        unique: true,
        partialFilterExpression: { sku: { $type: "string" } },
      },
    );
  } catch (error) {
    if (error?.code === 11000) {
      console.warn("No se pudo crear índice único de SKU por datos duplicados existentes.");
    } else {
      console.warn(`No se pudo crear índice único de SKU: ${error.message}`);
    }
  }

  try {
    await products.createIndex(
      { slug: 1 },
      {
        unique: true,
        partialFilterExpression: { slug: { $type: "string" } },
      },
    );
  } catch (error) {
    if (error?.code === 11000) {
      console.warn("No se pudo crear índice único de slug por datos duplicados existentes.");
    } else {
      console.warn(`No se pudo crear índice único de slug: ${error.message}`);
    }
  }

  indexesEnsured = true;
}

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.DATABASE_NAME || "mydatabase");
    await ensureIndexes(db);
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
