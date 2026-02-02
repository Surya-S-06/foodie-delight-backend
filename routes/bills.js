const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// Get bill by order ID (requires authentication)
router.get('/order/:orderId', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const orderId = req.params.orderId;
    const userId = req.session.userId;

    // Get bill with order and user details
    const [bills] = await pool.query(
      `SELECT b.*, o.*, u.name as user_name, u.phone as user_phone, u.email as user_email
       FROM bills b
       JOIN orders o ON b.order_id = o.id
       JOIN users u ON o.user_id = u.id
       WHERE b.order_id = ? AND o.user_id = ?`,
      [orderId, userId]
    );

    if (bills.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bill not found' 
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

    res.json({ 
      success: true, 
      bill: bills[0],
      items
    });
  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching bill' 
    });
  }
});

// Get bill by bill number (requires authentication)
router.get('/:billNumber', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const billNumber = req.params.billNumber;
    const userId = req.session.userId;

    // Get bill with order and user details
    const [bills] = await pool.query(
      `SELECT b.*, o.*, u.name as user_name, u.phone as user_phone, u.email as user_email
       FROM bills b
       JOIN orders o ON b.order_id = o.id
       JOIN users u ON o.user_id = u.id
       WHERE b.bill_number = ? AND o.user_id = ?`,
      [billNumber, userId]
    );

    if (bills.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bill not found' 
      });
    }

    // Get order items
    const [items] = await pool.query(
      `SELECT oi.*, h.name as hotel_name
       FROM order_items oi
       LEFT JOIN hotels h ON oi.hotel_id = h.id
       WHERE oi.order_id = ?`,
      [bills[0].order_id]
    );

    res.json({ 
      success: true, 
      bill: bills[0],
      items
    });
  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching bill' 
    });
  }
});

module.exports = router;
