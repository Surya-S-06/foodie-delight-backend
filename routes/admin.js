const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

// Hardcoded admin credentials
const ADMIN_USERNAME = 'suryafoodie';
const ADMIN_PASSWORD = 'suryaadmin';

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      req.session.isAdmin = true;
      req.session.adminUsername = username;
      res.json({ success: true, message: 'Login successful' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error logging out' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Check admin auth
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    next();
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
}

// Get all orders
router.get('/orders', requireAdmin, async (req, res) => {
  try {
    const pool = getPool();
    const [orders] = await pool.query(
      `SELECT o.*, u.name as user_name, u.phone as user_phone,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`
    );
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Error fetching orders' });
  }
});

// Get order details
router.get('/orders/:id', requireAdmin, async (req, res) => {
  try {
    const pool = getPool();
    const [items] = await pool.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [req.params.id]
    );
    res.json({ success: true, items });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ success: false, message: 'Error fetching order details' });
  }
});

// Update order status
router.put('/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const pool = getPool();
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true, message: 'Order status updated' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Error updating order status' });
  }
});

// Add/Update food item
router.post('/food', requireAdmin, async (req, res) => {
  try {
    const { id, name, category, type, price, description, image_url, is_available } = req.body;
    const pool = getPool();

    if (id) {
      await pool.query(
        `UPDATE food_items SET name = ?, time_slot = ?, type = ?, price = ?, description = ?, 
         image_url = ?, is_available = ? WHERE id = ?`,
        [name, category, type, price, description, image_url, is_available, id]
      );
      res.json({ success: true, message: 'Food item updated' });
    } else {
      await pool.query(
        `INSERT INTO food_items (name, time_slot, type, price, description, image_url, category, is_available) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, category, type, price, description, image_url, category, is_available]
      );
      res.json({ success: true, message: 'Food item added' });
    }
  } catch (error) {
    console.error('Save food item error:', error);
    res.status(500).json({ success: false, message: 'Error saving food item' });
  }
});

// Toggle food status (manual override)
router.put('/food/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const { is_available } = req.body;
    const pool = getPool();
    
    // When admin manually toggles, set manual_override to TRUE
    await pool.query(
      'UPDATE food_items SET is_available = ?, manual_override = TRUE WHERE id = ?', 
      [is_available, req.params.id]
    );
    
    res.json({ success: true, message: 'Food status updated' });
  } catch (error) {
    console.error('Toggle food status error:', error);
    res.status(500).json({ success: false, message: 'Error updating food status' });
  }
});

// Reset manual override (allow auto-availability)
router.put('/food/:id/reset-override', requireAdmin, async (req, res) => {
  try {
    const pool = getPool();
    await pool.query('UPDATE food_items SET manual_override = FALSE WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Manual override reset' });
  } catch (error) {
    console.error('Reset override error:', error);
    res.status(500).json({ success: false, message: 'Error resetting override' });
  }
});

// Delete food item
router.delete('/food/:id', requireAdmin, async (req, res) => {
  try {
    const pool = getPool();
    
    // Delete from hotel_food mapping first (foreign key constraint)
    await pool.query('DELETE FROM hotel_food WHERE food_id = ?', [req.params.id]);
    
    // Delete from order_items (set food_id to NULL to preserve order history)
    await pool.query('UPDATE order_items SET food_id = NULL WHERE food_id = ?', [req.params.id]);
    
    // Delete the food item
    await pool.query('DELETE FROM food_items WHERE id = ?', [req.params.id]);
    
    res.json({ success: true, message: 'Food item deleted successfully' });
  } catch (error) {
    console.error('Delete food error:', error);
    res.status(500).json({ success: false, message: 'Error deleting food item' });
  }
});

// Get restaurant status
router.get('/restaurant-status', requireAdmin, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM restaurant_status LIMIT 1');
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.json({ is_open: true, current_serving_time: 'breakfast' });
    }
  } catch (error) {
    console.error('Get restaurant status error:', error);
    res.status(500).json({ success: false, message: 'Error fetching restaurant status' });
  }
});

// Update restaurant status
router.put('/restaurant-status', requireAdmin, async (req, res) => {
  try {
    const { is_open, current_serving_time } = req.body;
    const pool = getPool();
    
    const [existing] = await pool.query('SELECT id FROM restaurant_status LIMIT 1');
    
    if (existing.length > 0) {
      const updates = [];
      const values = [];
      if (is_open !== undefined) {
        updates.push('is_open = ?');
        values.push(is_open);
      }
      if (current_serving_time !== undefined) {
        updates.push('current_serving_time = ?');
        values.push(current_serving_time);
      }
      values.push(existing[0].id);
      await pool.query(`UPDATE restaurant_status SET ${updates.join(', ')} WHERE id = ?`, values);
    } else {
      await pool.query(
        'INSERT INTO restaurant_status (is_open, current_serving_time) VALUES (?, ?)',
        [is_open !== undefined ? is_open : true, current_serving_time || 'breakfast']
      );
    }
    
    res.json({ success: true, message: 'Restaurant status updated' });
  } catch (error) {
    console.error('Update restaurant status error:', error);
    res.status(500).json({ success: false, message: 'Error updating restaurant status' });
  }
});

module.exports = router;


// Get users stats and list
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const pool = getPool();
    
    // Total users
    const [totalResult] = await pool.query('SELECT COUNT(*) as total FROM users');
    const total = totalResult[0].total;
    
    // New users this month
    const [newMonthResult] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())'
    );
    const newThisMonth = newMonthResult[0].count;
    
    // Active today (users who signed up today)
    const [activeTodayResult] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURRENT_DATE()'
    );
    const activeToday = activeTodayResult[0].count;
    
    // Latest users (sorted by newest first) - include password_hash for admin
    const [users] = await pool.query(
      'SELECT id, name, email, phone, password_hash, created_at FROM users ORDER BY created_at DESC LIMIT 50'
    );
    
    res.json({
      success: true,
      stats: {
        total,
        newThisMonth,
        activeToday
      },
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

// Get revenue stats
router.get('/revenue', requireAdmin, async (req, res) => {
  try {
    const pool = getPool();
    
    // Total revenue (using final_amount from bills which includes discount)
    const [totalResult] = await pool.query(
      'SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status IN ("Order Confirmed", "Preparing", "Out for Delivery", "Delivered")'
    );
    const totalRevenue = Math.round(totalResult[0].total);
    
    // Today's revenue
    const [todayResult] = await pool.query(
      'SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE DATE(created_at) = CURRENT_DATE() AND status IN ("Order Confirmed", "Preparing", "Out for Delivery", "Delivered")'
    );
    const todayRevenue = Math.round(todayResult[0].total);
    
    // This month's revenue
    const [monthResult] = await pool.query(
      'SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE()) AND status IN ("Order Confirmed", "Preparing", "Out for Delivery", "Delivered")'
    );
    const monthRevenue = Math.round(monthResult[0].total);
    
    // Total orders
    const [ordersResult] = await pool.query(
      'SELECT COUNT(*) as count FROM orders WHERE status IN ("Order Confirmed", "Preparing", "Out for Delivery", "Delivered")'
    );
    const totalOrders = ordersResult[0].count;
    
    // Average order value
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    
    res.json({
      success: true,
      stats: {
        totalRevenue,
        todayRevenue,
        monthRevenue,
        totalOrders,
        avgOrderValue
      }
    });
  } catch (error) {
    console.error('Get revenue error:', error);
    res.status(500).json({ success: false, message: 'Error fetching revenue' });
  }
});

module.exports = router;
