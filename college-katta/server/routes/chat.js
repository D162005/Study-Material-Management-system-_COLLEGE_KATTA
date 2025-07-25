import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import Chat from '../models/Chat.js';
import createError from 'http-errors';

const router = express.Router();

// Get all chat messages (most recent first, limited to 100 by default)
router.get('/', async (req, res, next) => {
  try {
    const { limit = 100 } = req.query;
    
    // Get messages, populate sender info, sort by most recent first
    const messages = await Chat.find()
      .populate('sender', 'username fullName role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
    
    // Return the messages array directly - NOT wrapped in another object
    res.status(200).json(messages);
  } catch (err) {
    console.error('Error fetching chat messages:', err);
    next(err);
  }
});

// Send a new chat message (requires authentication)
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { message } = req.body;
    
    if (!message || message.trim() === '') {
      return next(createError(400, 'Message content is required'));
    }
    
    if (message.length > 500) {
      return next(createError(400, 'Message must be less than 500 characters'));
    }
    
    // Create new chat message
    const newMessage = new Chat({
      message: message.trim(),
      sender: req.user.id
    });
    
    // Save message to database
    const savedMessage = await newMessage.save();
    
    // Populate sender info for response
    await savedMessage.populate('sender', 'username fullName role');
    
    // Return the message object directly - NOT wrapped in another object
    res.status(201).json(savedMessage);
  } catch (err) {
    console.error('Error sending chat message:', err);
    next(err);
  }
});

// For future: May implement message deletion for admins or own messages
// router.delete('/:id', verifyToken, async (req, res, next) => {...});

export default router; 