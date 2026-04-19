const express = require('express');
const cartService = require('../services/cart-service');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/me', authMiddleware, async (req, res) => {
    try {
        const cart = await cartService.getCartByUser(req.userId);
        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching authenticated cart' });
    }
});

router.put('/me', authMiddleware, async (req, res) => {
    try {
        const cartState = req.body ?? {};
        const updatedCart = await cartService.saveCartByUser(req.userId, cartState);
        res.json(updatedCart);
    } catch (error) {
        res.status(500).json({ error: 'Error saving authenticated cart' });
    }
});

router.delete('/me', authMiddleware, async (req, res) => {
    try {
        await cartService.clearCart(req.userId);
        res.json({ message: 'Cart cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error clearing authenticated cart' });
    }
});

router.get('/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const cart = await cartService.getCartByUser(userId);
        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching cart' });
    }
});

router.post('/:userId/items', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { productId, quantity, price } = req.body;
        const updatedCart = await cartService.addItemToCart(userId, productId, quantity, price);
        res.json(updatedCart);
    } catch (error) {
        res.status(500).json({ error: 'Error adding item to cart' });
    }
});

router.put('/:userId/items/:productId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const productId = req.params.productId;
        const { quantity, price } = req.body;
        const updatedCart = await cartService.addItemToCart(userId, productId, quantity, price);
        res.json(updatedCart);
    } catch (error) {
        res.status(500).json({ error: 'Error updating item in cart' });
    }
});

router.delete('/:userId/items', async (req, res) => {
    try {
        const userId = req.params.userId;
        await cartService.clearCart(userId);
        res.json({ message: 'Cart cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error clearing cart' });
    }
});

module.exports = router;