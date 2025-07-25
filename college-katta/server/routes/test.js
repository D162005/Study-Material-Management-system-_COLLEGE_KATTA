import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { createError } from '../utils/error.js';

const router = express.Router();

// Test database connection
router.get('/db-connection', async (req, res, next) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        success: false,
        message: 'MongoDB not connected',
        readyState: mongoose.connection.readyState
      });
    }
    
    // Get database name
    const dbName = mongoose.connection.db.databaseName;
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // Return database info
    res.status(200).json({
      success: true,
      message: 'MongoDB connected successfully',
      database: dbName,
      collections: collectionNames
    });
  } catch (error) {
    next(error);
  }
});

// Create admin user if it doesn't exist
router.post('/create-admin', async (req, res, next) => {
  try {
    // Check if admin already exists
    const adminExists = await User.findOne({ isAdmin: true });
    
    if (adminExists) {
      return res.status(200).json({
        success: true,
        message: 'Admin user already exists',
        admin: {
          username: adminExists.username,
          email: adminExists.email,
          _id: adminExists._id
        }
      });
    }
    
    // Create a salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    // Create admin user
    const adminUser = new User({
      username: 'admin',
      email: 'admin@college-katta.com',
      password: hashedPassword,
      fullName: 'Administrator',
      branch: 'Computer Science',
      year: '4th Year',
      isAdmin: true
    });
    
    // Save to database
    await adminUser.save();
    
    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      admin: {
        username: adminUser.username,
        email: adminUser.email,
        _id: adminUser._id
      }
    });
  } catch (error) {
    next(error);
  }
});

// Initialize DB with some test data
router.post('/init-data', async (req, res, next) => {
  try {
    // Create some test data (users, files, etc.)
    // This is just a placeholder - implement based on your needs
    
    res.status(200).json({
      success: true,
      message: 'Database initialized with test data'
    });
  } catch (error) {
    next(error);
  }
});

export default router; 