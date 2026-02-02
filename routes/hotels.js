const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

// Get all hotels
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const pool = getPool();
    
    let query = 'SELECT * FROM hotels WHERE is_active = TRUE';
    const params = [];

    if (type && type !== 'all') {
      query += ' AND (type = ? OR type = "both")';
      params.push(type);
    }

    query += ' ORDER BY rating DESC';

    const [hotels] = await pool.query(query, params);
    res.json(hotels);
  } catch (error) {
    console.error('Get hotels error:', error);
    res.status(500).json({ error: 'Error fetching hotels' });
  }
});

// Get hotel by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [hotels] = await pool.query(
      'SELECT * FROM hotels WHERE id = ?',
      [req.params.id]
    );

    if (hotels.length === 0) {
      return res.status(404).json({ error: 'Hotel not found' });
    }

    res.json(hotels[0]);
  } catch (error) {
    console.error('Get hotel error:', error);
    res.status(500).json({ error: 'Error fetching hotel' });
  }
});

module.exports = router;
