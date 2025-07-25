import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = 5002;

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));

// Create HTTP server
const server = http.createServer(app);

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Define Chat schema directly here to avoid import issues
const ChatSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    trim: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add index for efficient sorting
ChatSchema.index({ createdAt: -1 });

// Register the model
const Chat = mongoose.model('Chat', ChatSchema);

// Simple authentication middleware
const simpleAuth = (req, res, next) => {
  // For testing, we'll just accept any token
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  // Set a dummy user for testing
  req.user = {
    id: '6501234567890123456789ab',  // A dummy MongoDB ObjectId format
    username: 'testuser',
    role: 'user'
  };
  
  next();
};

// Routes
app.get('/api/chat', async (req, res) => {
  try {
    // For testing, return dummy data
    res.status(200).json([
      {
        _id: '65012345678901234567a001',
        message: 'Hello, this is a test message',
        sender: {
          _id: '6501234567890123456789ab',
          username: 'testuser',
          fullName: 'Test User',
          role: 'user'
        },
        createdAt: new Date()
      }
    ]);
  } catch (err) {
    console.error('Error fetching chat messages:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat messages'
    });
  }
});

app.post('/api/chat', simpleAuth, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }
    
    // For testing, return dummy data with the provided message
    res.status(201).json({
      _id: Math.random().toString(36).substring(2, 15),
      message: message.trim(),
      sender: {
        _id: req.user.id,
        username: req.user.username,
        fullName: 'Test User',
        role: req.user.role
      },
      createdAt: new Date()
    });
  } catch (err) {
    console.error('Error sending chat message:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to send chat message'
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.send('Simple Chat API Server is running');
});

// Start server
server.listen(PORT, () => {
  console.log(`Simple Chat Server running on port ${PORT}`);
  console.log(`API available at: http://localhost:${PORT}/api`);
});

// Handle server errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
}); 