class Review {
  constructor({ email = "", product_id = "", message = "", rating = 0 } = {}) {
    this.email = String(email).trim();
    this.product_id = String(product_id).trim();
    this.message = String(message).trim();
    this.rating = Number(rating);
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}

module.exports = Review;