const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// Place order (requires authentication)
router.post('/', requireAuth, async (req, res) => {
  const connection = await getPool().getConnection();
  
  try {
    const { items, total_amount, delivery_address, landmark, phone, coupon_code, discount_amount, payment_method, notes } = req.body;
    const userId = req.session.userId;

    if (!items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cart is empty' 
      });
    }

    // Build full delivery address
    const fullAddress = landmark ? `${delivery_address}, Near ${landmark}` : delivery_address;

    await connection.beginTransaction();

    // Create order with coupon and discount data
    const [orderResult] = await connection.query(
      `INSERT INTO orders (user_id, total_amount, status, payment_method, delivery_address, notes, coupon_code, discount_amount) 
       VALUES (?, ?, 'Order Confirmed', ?, ?, ?, ?, ?)`,
      [
        userId, 
        total_amount, 
        payment_method || 'Cash on Delivery', 
        fullAddress, 
        notes || null,
        coupon_code || null,
        discount_amount || 0
      ]
    );

    const orderId = orderResult.insertId;

    // Insert order items
    for (const item of items) {
      await connection.query(
        `INSERT INTO order_items (order_id, item_name, price, quantity, hotel_id, food_id) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.food_name || 'Food Item', item.price, item.quantity, item.hotel_id || 1, item.food_id]
      );
    }

    // Generate bill
    const billNumber = `BILL-${Date.now()}-${orderId}`;
    await connection.query(
      'INSERT INTO bills (order_id, bill_number, total_amount) VALUES (?, ?, ?)',
      [orderId, billNumber, total_amount]
    );

    await connection.commit();

    res.json({ 
      success: true, 
      message: 'Order placed successfully',
      orderId,
      billNumber,
      totalAmount: total_amount
    });
  } catch (error) {
    await connection.rollback();
    console.error('Place order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error placing order',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// Get user's orders (requires authentication) - MUST BE BEFORE /:id
router.get('/my', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.session.userId;
    
    console.log('Fetching all orders for user:', userId);
    
    // Fetch user's orders with coupon and discount info
    const [orders] = await pool.query(
      `SELECT id, total_amount, status, payment_method, delivery_address, notes, 
              coupon_code, discount_amount, created_at 
       FROM orders 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );
    
    console.log('Found', orders.length, 'orders for user');
    
    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching orders' 
    });
  }
});

// Get order details (requires authentication) - MUST BE AFTER /my
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const orderId = req.params.id;
    const userId = req.session.userId;

    console.log('Fetching order details for order:', orderId, 'user:', userId);

    // Get order
    const [orders] = await pool.query(
      `SELECT o.*, u.name as user_name, u.phone as user_phone, u.email as user_email,
              b.bill_number
       FROM orders o
       JOIN users u ON o.user_id = u.id
       LEFT JOIN bills b ON o.id = b.order_id
       WHERE o.id = ? AND o.user_id = ?`,
      [orderId, userId]
    );

    if (orders.length === 0) {
      console.log('Order not found or does not belong to user');
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // Get order items
    const [items] = await pool.query(
      `SELECT oi.*, h.name as hotel_name
       FROM order_items oi
       LEFT JOIN hotels h ON oi.hotel_id = h.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    console.log('Order found with', items.length, 'items');

    res.json({ 
      success: true, 
      order: orders[0],
      items
    });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching order details' 
    });
  }
});

// Get order items (requires authentication)
router.get('/:orderId/items', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.session.userId;
    const orderId = req.params.orderId;
    
    // Verify order belongs to user
    const [orders] = await pool.query(
      'SELECT id FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    
    // Fetch order items
    const [items] = await pool.query(
      'SELECT item_name, price, quantity FROM order_items WHERE order_id = ?',
      [orderId]
    );
    
    res.json({
      success: true,
      items
    });
  } catch (error) {
    console.error('Get order items error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching order items' 
    });
  }
});

module.exports = router;
