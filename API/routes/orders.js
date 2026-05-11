const express = require('express');
const orderService = require('../services/order-service');
const cartService = require('../services/cart-service');
const authMiddleware = require('../middlewares/authMiddleware');
const productService = require('../services/product-service');
const couponService = require('../services/coupon-service');
const emailService = require('../services/email-service');
const userService = require('../services/user-service');

const router = express.Router();

// Create order from cart (authenticated user)
router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { shippingAddress, couponCode } = req.body;

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
        selection: item.selection || item.variantAttributes || {},
        customization: item.customization || {},
      };
    });

    // Calculate subtotal
    const subtotal = normalizedItems.reduce((sum, item) => {
      const unitPrice = (item.basePrice || 0) + (item.variantAdditionalPrice || 0);
      return sum + (item.quantity * unitPrice);
    }, 0);

    if (subtotal <= 0) {
      return res.status(400).json({ error: 'Invalid cart total' });
    }

    // Validate and calculate discount from coupon
    let discount = 0;
    let validatedCoupon = null;
    
    if (couponCode) {
      try {
        validatedCoupon = await couponService.getCouponByCode(couponCode);
        
        if (!validatedCoupon) {
          return res.status(400).json({ error: 'Invalid coupon code' });
        }

        // Calculate discount
        if (validatedCoupon.discountType === 'percentage') {
          discount = Math.round((subtotal * validatedCoupon.discountValue) / 100 * 100) / 100;
        } else {
          discount = Math.min(validatedCoupon.discountValue, subtotal);
        }
      } catch (couponError) {
        return res.status(400).json({ error: 'Error validating coupon: ' + couponError.message });
      }
    }

    const total = Math.max(0, subtotal - discount);

    const appliedStockChanges = [];

    const rollbackAppliedStockChanges = async () => {
      for (const item of appliedStockChanges.reverse()) {
        try {
          await productService.incrementOrderItemStock({
            productId: item.product_id,
            productSku: item.simpleSku || item.productSku,
            variantSku: item.variantSku,
            selection: item.selection || {},
            quantity: item.quantity,
          });
        } catch (rollbackError) {
          console.error('Error restoring stock after failed checkout:', rollbackError);
        }
      }
    };

    for (const item of normalizedItems) {
      const stockResult = await productService.decrementOrderItemStock({
        productId: item.product_id,
        productSku: item.simpleSku || item.productSku,
        variantSku: item.variantSku,
        selection: item.selection || {},
        quantity: item.quantity,
      });

      if (!stockResult.ok) {
        await rollbackAppliedStockChanges();

        return res.status(409).json({
          error: 'INSUFFICIENT_STOCK',
          reason: stockResult.reason,
          productId: stockResult.productId,
          variantSku: stockResult.variantSku,
        });
      }

      appliedStockChanges.push(item);
    }

    try {
      // Create order with coupon info
      const order = await orderService.createOrder(
        userId,
        normalizedItems,
        subtotal,
        shippingAddress || {},
        couponCode || null,
        discount
      );

      // Clear user's cart
      await cartService.clearCart(userId);

      // Send confirmation email to user
      try {
        const user = await userService.findUserById(userId);
        if (user && user.email) {
          await emailService.sendOrderConfirmationEmail({
            recipientEmail: user.email,
            order: order,
            userName: user.email.split('@')[0], // Use email prefix as name if not available
          });
        }
      } catch (emailError) {
        // Log the error but don't fail the checkout
        console.error('Error sending confirmation email:', emailError);
      }

      res.status(201).json(order);
    } catch (orderCreationError) {
      await rollbackAppliedStockChanges();
      throw orderCreationError;
    }
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
    
    // Obtener datos del usuario para enviar el email
    try {
      const user = await userService.findUserById(updatedOrder.user_id.toString());
      if (user && user.email) {
        // Enviar email de notificación al usuario
        await emailService.sendOrderStatusEmail({
          recipientEmail: user.email,
          order: updatedOrder,
          newStatus: status,
        });
      }
    } catch (emailError) {
      // Log del error pero no falla la operación
      console.error('Error sending order status email:', emailError);
    }

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
