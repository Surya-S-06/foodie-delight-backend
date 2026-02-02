const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

// Get all food items (for frontend - returns ALL foods, never hide)
router.get('/', async (req, res) => {
  try {
    const { timeSlot, type, category } = req.query;
    const pool = getPool();
    
    // ALWAYS return all foods - never filter by is_available
    let query = 'SELECT * FROM food_items';
    const params = [];
    const conditions = [];

    if (timeSlot) {
      conditions.push('time_slot = ?');
      params.push(timeSlot);
    }

    if (type && type !== 'all') {
      conditions.push('type = ?');
      params.push(type);
    }

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY name';

    const [foods] = await pool.query(query, params);
    res.json(foods);
  } catch (error) {
    console.error('Get food items error:', error);
    res.status(500).json({ error: 'Error fetching food items' });
  }
});

// Get ALL food items (for admin - includes unavailable items)
router.get('/all', async (req, res) => {
  try {
    const pool = getPool();
    const [foods] = await pool.query('SELECT * FROM food_items ORDER BY name');
    res.json(foods);
  } catch (error) {
    console.error('Get all food items error:', error);
    res.status(500).json({ error: 'Error fetching food items' });
  }
});

// Update food availability based on time (auto-update)
router.post('/update-availability', async (req, res) => {
  try {
    const pool = getPool();
    
    // Get current hour
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour * 60 + minute;
    
    // Time slot definitions (in minutes from midnight)
    const timeSlots = {
      breakfast: { start: 6 * 60, end: 11 * 60 + 30 },      // 6:00 AM - 11:30 AM
      lunch: { start: 12 * 60, end: 15 * 60 + 30 },         // 12:00 PM - 3:30 PM
      evening: { start: 16 * 60, end: 19 * 60 },            // 4:00 PM - 7:00 PM
      dinner: { start: 19 * 60, end: 23 * 60 },             // 7:00 PM - 11:00 PM
      beverage: { start: 0, end: 24 * 60 }                  // Always available
    };
    
    // Get all foods that don't have manual override
    const [foods] = await pool.query('SELECT id, time_slot, manual_override FROM food_items WHERE manual_override = FALSE');
    
    // Update each food based on time slot
    for (const food of foods) {
      const slot = timeSlots[food.time_slot];
      if (slot) {
        const isAvailable = currentTime >= slot.start && currentTime <= slot.end;
        await pool.query('UPDATE food_items SET is_available = ? WHERE id = ?', [isAvailable, food.id]);
      }
    }
    
    res.json({ success: true, message: 'Availability updated', updatedCount: foods.length });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ error: 'Error updating availability' });
  }
});

// Get food item by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [foods] = await pool.query(
      'SELECT * FROM food_items WHERE id = ?',
      [req.params.id]
    );

    if (foods.length === 0) {
      return res.status(404).json({ error: 'Food item not found' });
    }

    res.json(foods[0]);
  } catch (error) {
    console.error('Get food item error:', error);
    res.status(500).json({ error: 'Error fetching food item' });
  }
});

// Get food items by hotel
router.get('/hotel/:hotelId', async (req, res) => {
  try {
    const pool = getPool();
    const [foods] = await pool.query(
      `SELECT f.* 
       FROM food_items f
       JOIN hotel_food hf ON f.id = hf.food_id
       WHERE hf.hotel_id = ? AND f.is_available = TRUE
       ORDER BY f.name`,
      [req.params.hotelId]
    );

    res.json(foods);
  } catch (error) {
    console.error('Get hotel food items error:', error);
    res.status(500).json({ error: 'Error fetching food items' });
  }
});

module.exports = router;
