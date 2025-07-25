import jwt from 'jsonwebtoken';
import { createError } from '../utils/error.js';
import User from '../models/User.js';

// Middleware to verify user authentication
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError(401, 'Access denied. No token provided or invalid format.'));
  }
  
  const token = authHeader.split(' ')[1];
    if (!token) {
    return next(createError(401, 'Access denied. No token provided.'));
    }
    
  try {
    // Verify token using the JWT_SECRET from environment
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user info to request object for use in route handlers
    req.user = {
      id: decoded.id,
      isAdmin: decoded.isAdmin
    };
    
    next();
  } catch (error) {
    next(createError(403, 'Invalid token'));
  }
};

// Middleware to verify admin access
export const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, (err) => {
    if (err) {
      return next(err);
    }
    
    if (!req.user.isAdmin) {
      return next(createError(403, 'Access denied. Admin privileges required.'));
    }
    
    next();
  });
};

// Middleware to verify current user or admin
export const verifyUserOrAdmin = (req, res, next) => {
  // Check if user is the same as requested user or is admin
  if (req.user.id === req.params.id || req.user.role === 'admin') {
    next();
  } else {
    return next(createError(403, 'You are not authorized to perform this action'));
  }
}; 