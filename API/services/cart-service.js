const connectDB = require("../db/mongo");
const { ObjectId } = require("mongodb");

async function getCartByUser(userId) {
    try {
        const db = await connectDB();
        const cart = await db.collection("carts").findOne({ userId: new ObjectId(userId) });
        return cart || { userId, items: [] };
    } catch (error) {
        console.error("Error fetching cart:", error);
        throw error;
    }
}

async function addItemToCart(userId, productId, quantity, price) {
    try {
        const db = await connectDB();
        const cartCollection = db.collection("carts");

        let cart = await cartCollection.findOne({ userId: new ObjectId(userId) });

        if (!cart) {
            cart = { userId: new ObjectId(userId), items: [] };
            await cartCollection.insertOne(cart);
        }

        const existingItemIndex = cart.items.findIndex(item => item.productId.equals(new ObjectId(productId)));

        if (existingItemIndex >= 0) {
            cart.items[existingItemIndex].quantity += quantity;
            cart.items[existingItemIndex].price = price;
        } else {
            cart.items.push({ productId: new ObjectId(productId), quantity, price });
        }

        await cartCollection.updateOne({ userId: new ObjectId(userId) }, { $set: { items: cart.items } });
        return cart;
    } catch (error) {
        console.error("Error adding item to cart:", error);
        throw error;
    }
}

async function clearCart(userId) {
    try {
        const db = await connectDB();
        await db.collection("carts").updateOne({ userId: new ObjectId(userId) }, { $set: { items: [] } });
    } catch (error) {
        console.error("Error clearing cart:", error);
        throw error;
    }
}

module.exports = {
    getCartByUser,
    addItemToCart,
    clearCart
};