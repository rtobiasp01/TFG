const express = require('express');
const orderService = require('../services/order-service');
const cartService = require('../services/cart-service');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Create order from cart (authenticated user)
router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { shippingAddress } = req.body;

    // Get user's cart
    const cart = await cartService.getCartByUser(userId);
    
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Normalize cart items for order
    const normalizedItems = cart.items.map(item => {
      const basePrice = Number(item.basePrice) || Number(item.price) || 0;
      const variantAdditionalPrice = Number(item.variantAdditionalPrice) || 0;
      const unitPrice = basePrice + variantAdditionalPrice;

      return {
        product_id: item.productId || item.product_id,
        productTitle: item.productTitle || item.title || 'Producto',
        quantity: Number(item.quantity) || 1,
        price: unitPrice,
        basePrice,
        variantAdditionalPrice,
        variantSku: item.variantSku,
        simpleSku: item.simpleSku,
        customization: item.customization || {},
      };
    });

    // Calculate total
    const total = normalizedItems.reduce((sum, item) => {
      const unitPrice = (item.basePrice || 0) + (item.variantAdditionalPrice || 0);
      return sum + (item.quantity * unitPrice);
    }, 0);

    if (total <= 0) {
      return res.status(400).json({ error: 'Invalid cart total' });
    }

    // Create order
    const order = await orderService.createOrder(userId, normalizedItems, total, shippingAddress || {});

    // Clear user's cart
    await cartService.clearCart(userId);

    res.status(201).json(order);
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Error creating order: ' + error.message });
  }
});

// Get user's orders (authenticated user)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const orders = await orderService.getOrdersByUserId(userId);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching user orders' });
  }
});

// Get single order by ID
router.get('/:orderId', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await orderService.getOrderById(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching order' });
  }
});

// Get all orders (admin only - requires authentication)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const orders = await orderService.getAllOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching orders' });
  }
});

// Update order status
router.put('/:orderId/status', authMiddleware, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updatedOrder = await orderService.updateOrderStatus(orderId, status);
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ error: 'Error updating order: ' + error.message });
  }
});

// Delete order
router.delete('/:orderId', authMiddleware, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    await orderService.deleteOrder(orderId);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting order' });
  }
});

module.exports = router;
