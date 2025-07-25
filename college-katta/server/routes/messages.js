import express from 'express';
import Message from '../models/Message.js';
import { createError } from '../utils/error.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Get messages for a specific chat (user-to-user or group)
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const { receiverId, group, limit = 100, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let query = {};
    
    if (group) {
      // Group messages
      query = {
        isGroupMessage: true,
        group
      };
    } else if (receiverId) {
      // Direct messages between two users
      query = {
        isGroupMessage: false,
        $or: [
          { sender: req.user._id, receiver: receiverId },
          { sender: receiverId, receiver: req.user._id }
        ]
      };
    } else {
      return next(createError(400, 'Either receiverId or group is required'));
    }
    
    const messages = await Message.find(query)
      .populate('sender', 'name email avatar')
      .populate('receiver', 'name email avatar')
      .populate('readBy', 'name email')
      .populate('reactions.user', 'name email')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Mark messages as read
    if (messages.length > 0 && !group) {
      await Message.updateMany(
        { sender: receiverId, receiver: req.user._id, readBy: { $ne: req.user._id } },
        { $addToSet: { readBy: req.user._id } }
      );
    }
    
    const total = await Message.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: messages.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      messages
    });
  } catch (error) {
    next(error);
  }
});

// Send a new message
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { content, receiverId, isGroupMessage, group, attachmentUrl, attachmentType } = req.body;
    
    if (!content && !attachmentUrl) {
      return next(createError(400, 'Message content or attachment is required'));
    }
    
    if (isGroupMessage && !group) {
      return next(createError(400, 'Group is required for group messages'));
    }
    
    if (!isGroupMessage && !receiverId) {
      return next(createError(400, 'Receiver is required for direct messages'));
    }
    
    const newMessage = new Message({
      content,
      sender: req.user._id,
      receiver: isGroupMessage ? null : receiverId,
      isGroupMessage,
      group,
      attachmentUrl,
      attachmentType,
      readBy: [req.user._id] // Sender has read the message
    });
    
    const savedMessage = await newMessage.save();
    
    const populatedMessage = await Message.findById(savedMessage._id)
      .populate('sender', 'name email avatar')
      .populate('receiver', 'name email avatar');
    
    res.status(201).json({
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    next(error);
  }
});

// Add reaction to a message
router.post('/:id/reactions', verifyToken, async (req, res, next) => {
  try {
    const { type } = req.body;
    
    if (!type) {
      return next(createError(400, 'Reaction type is required'));
    }
    
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return next(createError(404, 'Message not found'));
    }
    
    // Check if user already reacted
    const existingReactionIndex = message.reactions.findIndex(
      reaction => reaction.user.toString() === req.user._id.toString()
    );
    
    if (existingReactionIndex !== -1) {
      // Update existing reaction
      message.reactions[existingReactionIndex].type = type;
    } else {
      // Add new reaction
      message.reactions.push({
        user: req.user._id,
        type
      });
    }
    
    await message.save();
    
    const updatedMessage = await Message.findById(req.params.id)
      .populate('sender', 'name email avatar')
      .populate('receiver', 'name email avatar')
      .populate('reactions.user', 'name email');
    
    res.status(200).json({
      success: true,
      message: updatedMessage
    });
  } catch (error) {
    next(error);
  }
});

// Delete reaction from a message
router.delete('/:id/reactions', verifyToken, async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return next(createError(404, 'Message not found'));
    }
    
    // Remove user's reaction
    message.reactions = message.reactions.filter(
      reaction => reaction.user.toString() !== req.user._id.toString()
    );
    
    await message.save();
    
    const updatedMessage = await Message.findById(req.params.id)
      .populate('sender', 'name email avatar')
      .populate('receiver', 'name email avatar')
      .populate('reactions.user', 'name email');
    
    res.status(200).json({
      success: true,
      message: updatedMessage
    });
  } catch (error) {
    next(error);
  }
});

export default router; 