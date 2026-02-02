// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ 
      success: false, 
      message: 'Please login to continue',
      requiresLogin: true 
    });
  }
}

// Middleware to check if admin is authenticated
function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) {
    next();
  } else {
    res.status(401).json({ 
      success: false, 
      message: 'Admin authentication required' 
    });
  }
}

// Middleware to attach user info to request
async function attachUser(req, res, next) {
  if (req.session && req.session.userId) {
    try {
      const { getPool } = require('../config/database');
      const pool = getPool();
      
      const [users] = await pool.query(
        'SELECT id, name, email, phone FROM users WHERE id = ?',
        [req.session.userId]
      );
      
      if (users.length > 0) {
        req.user = users[0];
      }
    } catch (error) {
      console.error('Error attaching user:', error);
    }
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  attachUser
};
