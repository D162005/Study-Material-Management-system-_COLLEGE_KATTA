import jwt from 'jsonwebtoken';
import createError from 'http-errors';

export const verifyToken = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError(401, 'Access denied. No token provided or invalid format.'));
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    return next(createError(401, 'Access denied. No token provided.'));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user data to request
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(createError(401, 'Token expired. Please login again.'));
    }
    
    return next(createError(403, 'Invalid token.'));
  }
};

// Verify admin permissions
export const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, (err) => {
    if (err) {
      return next(err);
    }
    
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Access denied. Admin privileges required.'));
    }
    
    next();
  });
}; 