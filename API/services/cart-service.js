const connectDB = require("../db/mongo");
const { ObjectId } = require("mongodb");

function sanitizeCartState(cartState) {
    const rawItems = Array.isArray(cartState?.items) ? cartState.items : [];
    const items = rawItems
        .filter((item) => item && typeof item === "object")
        .map((item) => ({ ...item }));

    const parsedLastUpdated = Number(cartState?.lastUpdated);
    const lastUpdated = Number.isFinite(parsedLastUpdated) ? parsedLastUpdated : Date.now();

    return { items, lastUpdated };
}

async function getCartByUser(userId) {
    try {
        const db = await connectDB();
        const cart = await db.collection("carts").findOne({ userId: new ObjectId(userId) });
        if (!cart) {
            return { userId, items: [], lastUpdated: 0 };
        }

        const { items, lastUpdated } = sanitizeCartState(cart);
        return {
            userId,
            items,
            lastUpdated,
        };
    } catch (error) {
        console.error("Error fetching cart:", error);
        throw error;
    }
}

async function saveCartByUser(userId, cartState) {
    try {
        const db = await connectDB();
        const cartCollection = db.collection("carts");
        const normalizedCart = sanitizeCartState(cartState);
        const userObjectId = new ObjectId(userId);

        await cartCollection.updateOne(
            { userId: userObjectId },
            {
                $set: {
                    userId: userObjectId,
                    items: normalizedCart.items,
                    lastUpdated: normalizedCart.lastUpdated,
                    updatedAt: new Date(),
                },
            },
            { upsert: true }
        );

        return {
            userId,
            items: normalizedCart.items,
            lastUpdated: normalizedCart.lastUpdated,
        };
    } catch (error) {
        console.error("Error saving cart:", error);
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
        return await saveCartByUser(userId, { items: [], lastUpdated: Date.now() });
    } catch (error) {
        console.error("Error clearing cart:", error);
        throw error;
    }
}

module.exports = {
    getCartByUser,
    saveCartByUser,
    addItemToCart,
    clearCart
};