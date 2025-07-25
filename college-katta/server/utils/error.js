import createHttpError from 'http-errors';

export const createError = (status, message) => {
  return createHttpError(status, message);
};

export const handleError = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  console.error(`[ERROR] ${req.method} ${req.url} - ${statusCode}: ${message}`);
  
  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
}; 