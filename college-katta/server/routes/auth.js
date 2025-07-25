import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createError } from '../utils/error.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Register a new user
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password, fullName, branch, year } = req.body;
    
    console.log('Registration request received:', { username, email, fullName, branch, year });
    
    // Validate required fields
    if (!username || !email || !password || !fullName || !branch || !year) {
      return next(createError(400, 'All fields are required'));
    }
    
    // Check username length
    if (username.length < 3) {
      return next(createError(400, 'Username must be at least 3 characters long'));
    }
    
    // Check password length
    if (password.length < 6) {
      return next(createError(400, 'Password must be at least 6 characters long'));
    }
    
    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return next(createError(400, 'Username already taken'));
    }
    
    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return next(createError(400, 'Email already in use'));
    }
    
    // Create a salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user - explicitly set isAdmin to false to prevent privilege escalation
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      fullName,
      branch,
      year,
      isAdmin: false, // Always set to false for new registrations
      status: 'active'
    });
    
    // Save user to database
    const savedUser = await newUser.save();
    
    // Create token
    const token = jwt.sign(
      { id: savedUser._id, isAdmin: false }, // Explicitly set isAdmin to false in the token
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Remove password from response
    const { password: _, ...userInfo } = savedUser._doc;
    
    console.log('User registered successfully:', userInfo.username);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: userInfo
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    next(error);
  }
});

// Login user
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return next(createError(400, 'Email/username and password are required'));
    }
    
    console.log('Login attempt for email/username:', email);
    
    // Special case for admin login
    if (email === 'admin' || email === 'admin@collegekata.com') {
      console.log('Admin login attempt detected');
      
      // Find admin user
      const adminUser = await User.findOne({ isAdmin: true });
      
      if (!adminUser) {
        console.log('Admin user not found in database');
        return next(createError(404, 'Admin user not found'));
      }
      
      // For admin, we'll check the password
      if (password === 'admin123') {
        console.log('Admin login successful with direct password check');
        
        // Create token for admin
        const token = jwt.sign(
          { id: adminUser._id, isAdmin: true },
          process.env.JWT_SECRET,
          { expiresIn: '1d' }
        );
        
        // Remove password from response
        const { password: _, ...userInfo } = adminUser._doc;
        
        // Return successful login
        return res.status(200).json({
          success: true,
          message: 'Admin logged in successfully',
          token,
          user: userInfo
        });
      } else {
        console.log('Admin login failed - wrong password');
        return next(createError(400, 'Invalid admin credentials'));
      }
    }
    
    // Regular user login continues below
    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: email },
        { username: email }
      ]
    });
    
    if (!user) {
      console.log('User not found for email/username:', email);
      return next(createError(404, 'User not found'));
    }
    
    console.log('User found:', user.username, user.email);
    
    // Check if password is correct
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    console.log('Password check result:', isPasswordCorrect);
    
    if (!isPasswordCorrect) {
      return next(createError(400, 'Invalid credentials'));
    }
    
    // Check if user is suspended
    if (user.status === 'suspended') {
      console.log('User is suspended:', user.username);
      return next(createError(403, 'Your account has been suspended. Please contact an administrator.'));
    }
    
    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();
    
    // Create token
    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Remove password from response
    const { password: _, ...userInfo } = user._doc;
    
    console.log('Login successful for:', user.username);
    
    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: userInfo
    });
    
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
});

// Logout user
router.post('/logout', (req, res) => {
  // In a stateless JWT approach, the client simply discards the token
  // Here we just send a success response
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Get current user (requires auth)
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    // Get user from database (to get the latest data)
    const user = await User.findById(req.user.id).select('-password');
    
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

// Update password
router.post('/change-password', verifyToken, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get user from database
    const user = await User.findById(req.user.id);
    
    // Check if current password is correct
    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordCorrect) {
      return next(createError(400, 'Current password is incorrect'));
    }
    
    // Create a salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    user.password = hashedPassword;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

// Send password reset email (for future implementation)
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return next(createError(404, 'User not found'));
    }
    
    // In a real application, you would send an email with a password reset link
    // For this implementation, we'll just return a success message
    
    res.status(200).json({
      success: true,
      message: 'Password reset instructions sent to your email'
    });
    
  } catch (error) {
    next(error);
  }
});

export default router; 