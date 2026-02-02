const express = require('express');
const router = express.Router();

// Initialize cart in session if not exists
function initCart(req) {
  if (!req.session.cart) {
    req.session.cart = [];
  }
}

// Get cart
router.get('/', (req, res) => {
  initCart(req);
  res.json({ 
    success: true, 
    cart: req.session.cart,
    count: req.session.cart.reduce((sum, item) => sum + item.quantity, 0)
  });
});

// Add item to cart
router.post('/add', (req, res) => {
  try {
    initCart(req);
    
    const { foodId, foodName, price, quantity, hotelId, hotelName, imageUrl } = req.body;

    if (!foodId || !foodName || !price || !quantity) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Check if item already exists in cart
    const existingItemIndex = req.session.cart.findIndex(
      item => item.foodId === foodId && item.hotelId === hotelId
    );

    if (existingItemIndex > -1) {
      // Update quantity
      req.session.cart[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      req.session.cart.push({
        foodId,
        foodName,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        hotelId,
        hotelName,
        imageUrl
      });
    }

    const cartCount = req.session.cart.reduce((sum, item) => sum + item.quantity, 0);

    res.json({ 
      success: true, 
      message: 'Item added to cart',
      cart: req.session.cart,
      count: cartCount
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error adding item to cart' 
    });
  }
});

// Update cart item quantity
router.put('/update', (req, res) => {
  try {
    initCart(req);
    
    const { foodId, hotelId, quantity } = req.body;

    if (!foodId || quantity === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    const itemIndex = req.session.cart.findIndex(
      item => item.foodId === foodId && item.hotelId === hotelId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Item not found in cart' 
      });
    }

    if (quantity <= 0) {
      // Remove item
      req.session.cart.splice(itemIndex, 1);
    } else {
      // Update quantity
      req.session.cart[itemIndex].quantity = parseInt(quantity);
    }

    const cartCount = req.session.cart.reduce((sum, item) => sum + item.quantity, 0);

    res.json({ 
      success: true, 
      message: 'Cart updated',
      cart: req.session.cart,
      count: cartCount
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating cart' 
    });
  }
});

// Remove item from cart
router.delete('/remove', (req, res) => {
  try {
    initCart(req);
    
    const { foodId, hotelId } = req.body;

    if (!foodId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Food ID is required' 
      });
    }

    req.session.cart = req.session.cart.filter(
      item => !(item.foodId === foodId && item.hotelId === hotelId)
    );

    const cartCount = req.session.cart.reduce((sum, item) => sum + item.quantity, 0);

    res.json({ 
      success: true, 
      message: 'Item removed from cart',
      cart: req.session.cart,
      count: cartCount
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error removing item from cart' 
    });
  }
});

// Clear cart
router.delete('/clear', (req, res) => {
  req.session.cart = [];
  res.json({ 
    success: true, 
    message: 'Cart cleared',
    cart: [],
    count: 0
  });
});

// Get cart count
router.get('/count', (req, res) => {
  initCart(req);
  const count = req.session.cart.reduce((sum, item) => sum + item.quantity, 0);
  res.json({ success: true, count });
});

module.exports = router;
