const connectDB = require("../db/mongo");
const { ObjectId } = require("mongodb");

function normalizeReviewInput(reviewData = {}) {
  return {
    email: String(reviewData.email || "").trim(),
    product_id: String(reviewData.product_id || "").trim(),
    message: String(reviewData.message || "").trim(),
    rating: Number(reviewData.rating),
  };
}

function validateReviewInput(reviewData = {}) {
  const normalized = normalizeReviewInput(reviewData);

  if (!normalized.email) {
    throw new Error("Email is required");
  }

  if (!normalized.product_id) {
    throw new Error("Product ID is required");
  }

  if (!ObjectId.isValid(normalized.product_id)) {
    throw new Error("Invalid product ID");
  }

  if (!normalized.message) {
    throw new Error("Review message is required");
  }

  if (!Number.isInteger(normalized.rating) || normalized.rating < 1 || normalized.rating > 5) {
    throw new Error("Rating must be an integer between 1 and 5");
  }

  return normalized;
}

async function createReview(reviewData) {
  try {
    const db = await connectDB();
    const collection = db.collection("reviews");
    const review = validateReviewInput(reviewData);

    const document = {
      email: review.email,
      product_id: new ObjectId(review.product_id),
      message: review.message,
      rating: review.rating,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(document);

    return { _id: result.insertedId, ...document };
  } catch (error) {
    throw new Error(`Error creating review: ${error.message}`);
  }
}

async function getAllReviews() {
  try {
    const db = await connectDB();
    const collection = db.collection("reviews");
    return await collection.find({}).sort({ createdAt: -1 }).toArray();
  } catch (error) {
    throw new Error(`Error fetching reviews: ${error.message}`);
  }
}

async function getReviewsByProductId(productId) {
  try {
    if (!ObjectId.isValid(productId)) {
      throw new Error("Invalid product ID");
    }

    const db = await connectDB();
    const collection = db.collection("reviews");
    return await collection
      .find({ product_id: new ObjectId(productId) })
      .sort({ createdAt: -1 })
      .toArray();
  } catch (error) {
    throw new Error(`Error fetching product reviews: ${error.message}`);
  }
}

module.exports = {
  createReview,
  getAllReviews,
  getReviewsByProductId,
};