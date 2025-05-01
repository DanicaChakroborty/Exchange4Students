const express = require('express');
const session = require('express-session');
const path = require('path');
const fileUpload = require('express-fileupload');
const { testConnection } = require('./db');
const User = require('./userModel');
const Item = require('./itemModel');
const Cart = require('./cartModel');
const Order = require('./orderModel');
const Notification = require('./notificationModel');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}));

// Session configuration
app.use(session({
  secret: 'student_marketplace_secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
};

// Test database connection
testConnection()
  .then(success => {
    if (success) {
      console.log('Database connection test succeeded');
    } else {
      console.error('Database connection test failed');
    }
  })
  .catch(error => {
    console.error('Error testing database connection:', error);
  });

// Routes

// Auth routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, email, role } = req.body;
    const userId = await User.create(username, password, email, role);
    req.session.userId = userId;
    req.session.username = username;
    req.session.role = role;
    res.status(201).json({ userId, username, role });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.authenticate(username, password);
    
    if (user) {
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;
      res.json({ userId: user.id, username: user.username, role: user.role });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

// User routes
app.get('/api/user', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    res.json({ userId: user.id, username: user.username, email: user.email, role: user.role });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user data', error: error.message });
  }
});

app.put('/api/user/role', isAuthenticated, async (req, res) => {
  try {
    const { role } = req.body;
    const success = await User.updateRole(req.session.userId, role);
    
    if (success) {
      req.session.role = role;
      res.json({ role });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user role', error: error.message });
  }
});

// Item routes
app.get('/api/items', async (req, res) => {
  try {
    const items = await Item.getAll();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch items', error: error.message });
  }
});

app.get('/api/items/:id', async (req, res) => {
  try {
    const item = await Item.getById(req.params.id);
    
    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch item', error: error.message });
  }
});

app.get('/api/items/category/:category', async (req, res) => {
  try {
    const items = await Item.getByCategory(req.params.category);
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch items', error: error.message });
  }
});

app.get('/api/items/search/:query', async (req, res) => {
  try {
    const items = await Item.search(req.params.query);
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to search items', error: error.message });
  }
});

app.post('/api/items', isAuthenticated, async (req, res) => {
  try {
    // Check if user is a seller
    if (req.session.role !== 'seller' && req.session.role !== 'both') {
      return res.status(403).json({ message: 'Only sellers can list items' });
    }
    
    let imageUrl = null;
    
    // Handle image upload
    if (req.files && req.files.image) {
      const image = req.files.image;
      const uniqueFilename = `${Date.now()}_${image.name}`;
      const uploadPath = path.join(__dirname, 'public', 'uploads', uniqueFilename);
      
      await image.mv(uploadPath);
      imageUrl = `/uploads/${uniqueFilename}`;
    }
    
    const { title, description, price, category, condition } = req.body;
    const sellerId = req.session.userId;
    
    const itemId = await Item.create(sellerId, title, description, price, category, condition, imageUrl);
    res.status(201).json({ itemId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create item', error: error.message });
  }
});

app.put('/api/items/:id', isAuthenticated, async (req, res) => {
  try {
    const item = await Item.getById(req.params.id);
    
    // Check if user is the seller of this item
    if (item.seller_id !== req.session.userId) {
      return res.status(403).json({ message: 'You can only edit your own items' });
    }
    
    const { title, description, price, category, condition } = req.body;
    let imageUrl = item.image_url;
    
    // Handle image upload if a new image is provided
    if (req.files && req.files.image) {
      const image = req.files.image;
      const uniqueFilename = `${Date.now()}_${image.name}`;
      const uploadPath = path.join(__dirname, 'public', 'uploads', uniqueFilename);
      
      await image.mv(uploadPath);
      imageUrl = `/uploads/${uniqueFilename}`;
    }
    
    const success = await Item.update(req.params.id, title, description, price, category, condition, imageUrl);
    
    if (success) {
      res.json({ message: 'Item updated successfully' });
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to update item', error: error.message });
  }
});

app.delete('/api/items/:id', isAuthenticated, async (req, res) => {
  try {
    const item = await Item.getById(req.params.id);
    
    // Check if user is the seller of this item
    if (item.seller_id !== req.session.userId) {
      return res.status(403).json({ message: 'You can only delete your own items' });
    }
    
    const success = await Item.delete(req.params.id);
    
    if (success) {
      res.json({ message: 'Item deleted successfully' });
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete item', error: error.message });
  }
});

// Cart routes
app.get('/api/cart', isAuthenticated, async (req, res) => {
  try {
    const cartItems = await Cart.getItems(req.session.userId);
    const totalPrice = await Cart.getTotalPrice(req.session.userId);
    
    res.json({ items: cartItems, totalPrice });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch cart', error: error.message });
  }
});

app.post('/api/cart', isAuthenticated, async (req, res) => {
  try {
    const { itemId, quantity } = req.body;
    await Cart.addItem(req.session.userId, itemId, quantity);
    
    const cartItems = await Cart.getItems(req.session.userId);
    const totalPrice = await Cart.getTotalPrice(req.session.userId);
    
    res.status(201).json({ items: cartItems, totalPrice });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add item to cart', error: error.message });
  }
});

app.put('/api/cart/:itemId', isAuthenticated, async (req, res) => {
  try {
    const { quantity } = req.body;
    await Cart.updateQuantity(req.session.userId, req.params.itemId, quantity);
    
    const cartItems = await Cart.getItems(req.session.userId);
    const totalPrice = await Cart.getTotalPrice(req.session.userId);
    
    res.json({ items: cartItems, totalPrice });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update cart', error: error.message });
  }
});

app.delete('/api/cart/:itemId', isAuthenticated, async (req, res) => {
  try {
    await Cart.removeItem(req.session.userId, req.params.itemId);
    
    const cartItems = await Cart.getItems(req.session.userId);
    const totalPrice = await Cart.getTotalPrice(req.session.userId);
    
    res.json({ items: cartItems, totalPrice });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove item from cart', error: error.message });
  }
});

app.delete('/api/cart', isAuthenticated, async (req, res) => {
  try {
    await Cart.clearCart(req.session.userId);
    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to clear cart', error: error.message });
  }
});

// Order routes
app.post('/api/orders', isAuthenticated, async (req, res) => {
  try {
    const orderId = await Order.createFromCart(req.session.userId);
    res.status(201).json({ orderId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
});

app.get('/api/orders', isAuthenticated, async (req, res) => {
  try {
    const orders = await Order.getUserOrders(req.session.userId);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
});

app.get('/api/orders/:id', isAuthenticated, async (req, res) => {
  try {
    const order = await Order.getById(req.params.id);
    
    if (order) {
      // Check if user is the buyer or the seller of any item in this order
      if (order.buyer_id !== req.session.userId && !order.items.some(item => item.seller_id === req.session.userId)) {
        return res.status(403).json({ message: 'You can only view your own orders' });
      }
      
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch order', error: error.message });
  }
});

app.get('/api/seller/orders', isAuthenticated, async (req, res) => {
  try {
    // Check if user is a seller
    if (req.session.role !== 'seller' && req.session.role !== 'both') {
      return res.status(403).json({ message: 'Only sellers can view seller orders' });
    }
    
    const orders = await Order.getSellerOrders(req.session.userId);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch seller orders', error: error.message });
  }
});

app.put('/api/orders/:id/status', isAuthenticated, async (req, res) => {
  try {
    const order = await Order.getById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check if user is a seller of any item in this order
    if (!order.items.some(item => item.seller_id === req.session.userId)) {
      return res.status(403).json({ message: 'You can only update status of your own orders' });
    }
    
    const { status } = req.body;
    const success = await Order.updateStatus(req.params.id, status);
    
    if (success) {
      // Notify the buyer
      await Notification.create(
        order.buyer_id,
        `Your order #${req.params.id} status has been updated to: ${status}`
      );
      
      res.json({ message: 'Order status updated successfully' });
    } else {
      res.status(500).json({ message: 'Failed to update order status' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to update order status', error: error.message });
  }
});

// Notification routes
app.get('/api/notifications', isAuthenticated, async (req, res) => {
  try {
    const notifications = await Notification.getUserNotifications(req.session.userId);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
});

app.get('/api/notifications/unread', isAuthenticated, async (req, res) => {
  try {
    const notifications = await Notification.getUnreadNotifications(req.session.userId);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch unread notifications', error: error.message });
  }
});

app.put('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
  try {
    const notification = await Notification.getById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    if (notification.user_id !== req.session.userId) {
      return res.status(403).json({ message: 'You can only mark your own notifications as read' });
    }
    
    await Notification.markAsRead(req.params.id);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark notification as read', error: error.message });
  }
});

app.put('/api/notifications/read-all', isAuthenticated, async (req, res) => {
  try {
    await Notification.markAllAsRead(req.session.userId);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark all notifications as read', error: error.message });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// For any routes not covered, serve the index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});