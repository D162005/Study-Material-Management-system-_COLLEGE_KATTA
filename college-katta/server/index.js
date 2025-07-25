import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';

import connectToDatabase from './setupDatabase.js';
import seedAdminUser from './utils/adminSeeder.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import fileRoutes from './routes/files.js';
import studyMaterialRoutes from './routes/studyMaterials.js';
import messageRoutes from './routes/messages.js';
import chatRoutes from './routes/chat.js';
import testRoutes from './routes/test.js';
import personalFilesRoutes from './routes/personalFiles.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Create Socket.io server
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Connect to MongoDB with schema setup
connectToDatabase()
  .then(async () => {
    console.log('🚀 Database setup complete, server ready');
    
    // Seed admin user
    await seedAdminUser();
    
    // Start HTTP server only after DB connection is established
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API available at: http://localhost:${PORT}/api`);
    });
  })
  .catch((error) => {
    console.error('❌ Server initialization error:', error);
    process.exit(1);
  });

// Socket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token is missing'));
    }
    
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Attach user data to socket
      socket.userId = decoded.id;
      socket.user = decoded;
      
      console.log(`Socket authenticated for user: ${decoded.id}`);
      return next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      return next(new Error('Invalid authentication token'));
    }
  } catch (error) {
    console.error('Socket middleware error:', error);
    return next(new Error('Internal server error'));
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected', socket.id, 'User:', socket.userId);
  
  // Join a chat room
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.userId} joined room: ${roomId}`);
  });
  
  // Send a message
  socket.on('send_message', (messageData) => {
    console.log(`Message sent to room ${messageData.room}:`, messageData.content);
    socket.to(messageData.room).emit('receive_message', messageData);
  });
  
  // User typing
  socket.on('typing', (data) => {
    socket.to(data.room).emit('typing', data);
  });
  
  // User stops typing
  socket.on('stop_typing', (data) => {
    socket.to(data.room).emit('stop_typing', data);
  });
  
  // Handle ping from client (keep-alive)
  socket.on('ping', () => {
    socket.emit('pong');
  });
  
  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
  
  // Disconnect
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected', socket.id, 'Reason:', reason);
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/study-materials', studyMaterialRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/test', testRoutes);
app.use('/api/personal-files', personalFilesRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('College-Katta API Server is running');
});

// API health check
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'College-Katta API is running',
    version: '1.0.0',
    timestamp: new Date()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  console.error(`[ERROR] ${req.method} ${req.url} - Status: ${statusCode} - Message: ${message}`);
  if (err.stack) {
    console.error(err.stack);
  }
  
  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
}); 