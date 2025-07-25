import express from 'express';
import User from '../models/User.js';
import { createError } from '../utils/error.js';
import { verifyToken, verifyAdmin, verifyUserOrAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', verifyToken, verifyAdmin, async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    
    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
});

// Get user by ID (admin or user themselves)
router.get('/:id', verifyToken, verifyUserOrAdmin, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return next(createError(404, 'User not found'));
    }
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
});

// Update user (admin or user themselves)
router.put('/:id', verifyToken, verifyUserOrAdmin, async (req, res, next) => {
  try {
    // Don't allow isAdmin updates unless admin
    if (req.body.isAdmin !== undefined && !req.user.isAdmin) {
      return next(createError(403, 'You cannot update admin status'));
    }
    
    // Don't allow password in this route
    if (req.body.password) {
      return next(createError(400, 'Cannot update password through this route'));
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).select('-password');
    
    if (!updatedUser) {
      return next(createError(404, 'User not found'));
    }
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
});

// Delete user (admin or user themselves)
router.delete('/:id', verifyToken, verifyUserOrAdmin, async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return next(createError(404, 'User not found'));
    }
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Change user admin status (admin only)
router.patch('/:id/admin', verifyToken, verifyAdmin, async (req, res, next) => {
  try {
    const { isAdmin } = req.body;
    
    if (isAdmin === undefined) {
      return next(createError(400, 'isAdmin field is required'));
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return next(createError(404, 'User not found'));
    }
    
    // Don't allow changing your own admin status
    if (user._id.toString() === req.user.id.toString()) {
      return next(createError(403, 'You cannot change your own admin status'));
    }
    
    user.isAdmin = isAdmin;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: isAdmin ? 'User promoted to admin' : 'Admin privileges revoked',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    next(error);
  }
});

// Change user status (active/suspended) (admin only)
router.patch('/:id/status', verifyToken, verifyAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!status || !['active', 'suspended'].includes(status)) {
      return next(createError(400, 'Valid status is required (active or suspended)'));
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return next(createError(404, 'User not found'));
    }
    
    // Prevent suspending yourself
    if (user._id.toString() === req.user.id.toString()) {
      return next(createError(403, 'You cannot change your own status'));
    }
    
    // Prevent suspending other admins
    if (user.isAdmin && status === 'suspended') {
      return next(createError(403, 'Cannot suspend an admin user'));
    }
    
    user.status = status;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: `User status updated to ${status}`,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router; 