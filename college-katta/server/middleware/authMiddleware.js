import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Protect routes that require authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const protect = async (req, res, next) => {
  try {
    console.log('Auth middleware called');
    let token;
    
    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      console.log('Token found in Authorization header');
    } 
    // Check for token in cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('Token found in cookies');
    }
    
    // Check if token exists
    if (!token) {
      console.error('No token found in request');
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }
    
    try {
      console.log('Verifying token...');
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verified, user ID:', decoded.id);
      
      // Get user from database, excluding password
      console.log('Finding user in database...');
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        console.error('User not found in database');
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }
      
      console.log('User authenticated successfully:', user._id);
      // Set user in request object
      req.user = user;
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

/**
 * Restrict access to certain roles
 * @param {...String} roles - Roles allowed to access the route
 * @returns {Function} Middleware function
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no user'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this resource`
      });
    }
    
    next();
  };
}; 