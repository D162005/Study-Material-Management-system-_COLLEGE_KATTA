import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Local storage path
const LOCAL_STORAGE_PATH = path.join(__dirname, 'local_storage');

// Ensure local storage directory exists
const ensureLocalStorageExists = () => {
  if (!fs.existsSync(LOCAL_STORAGE_PATH)) {
    fs.mkdirSync(LOCAL_STORAGE_PATH, { recursive: true });
    console.log('📁 Created local storage directory at:', LOCAL_STORAGE_PATH);
  }
  
  // Create subdirectories for different data types
  const subdirs = ['study_materials', 'files', 'user_data'];
  subdirs.forEach(subdir => {
    const subdirPath = path.join(LOCAL_STORAGE_PATH, subdir);
    if (!fs.existsSync(subdirPath)) {
      fs.mkdirSync(subdirPath, { recursive: true });
    }
  });
  
  console.log('📁 Local storage is ready for use');
};

// Global flag to track if we're using local storage fallback
export let usingLocalStorage = false;

// Connect to MongoDB
const connectToDatabase = async () => {
  try {
    // Ensure local storage exists as a fallback
    ensureLocalStorageExists();
    
    // Disable strict query for development
    mongoose.set('strictQuery', false);
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ MongoDB connected successfully!');
    console.log(`🏢 Database name: ${conn.connection.db.databaseName}`);
    console.log(`🌐 Host: ${conn.connection.host}`);
    
    // Define schemas if they don't already exist
    await setupSchemas();
    
    usingLocalStorage = false;
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    console.log('⚠️ Falling back to local storage mode...');
    
    // Set the flag that we're using local storage
    usingLocalStorage = true;
    
    // Setup local storage as fallback
    setupLocalStorageFallback();
    
    // Don't exit, let the app continue with local storage
    return false;
  }
};

// Setup local storage fallback
const setupLocalStorageFallback = () => {
  console.log('📦 Setting up local storage fallback...');
  
  // Create index files to store metadata
  const indexFiles = [
    { name: 'users.json', default: { users: [] } },
    { name: 'files.json', default: { files: [] } },
    { name: 'study_materials.json', default: { materials: [] } },
    { name: 'messages.json', default: { messages: [] } },
    { name: 'chat.json', default: { messages: [] } }
  ];
  
  indexFiles.forEach(file => {
    const filePath = path.join(LOCAL_STORAGE_PATH, file.name);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(file.default, null, 2));
      console.log(`📝 Created index file: ${file.name}`);
    }
  });
  
  console.log('✅ Local storage fallback is ready');
};

// Define schemas and models
const setupSchemas = async () => {
  // Check existing collections
  const collections = await mongoose.connection.db.listCollections().toArray();
  const collectionNames = collections.map(c => c.name);
  console.log('📊 Existing collections:', collectionNames.length ? collectionNames.join(', ') : 'None');
  
  // Define User schema if it doesn't exist
  if (!mongoose.models.User) {
    const UserSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      fullName: { type: String, required: true },
      profilePicture: { type: String, default: '' },
      isAdmin: { type: Boolean, default: false },
      branch: { type: String, required: true },
      year: { type: String, required: true },
      bio: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now }
    });
    mongoose.model('User', UserSchema);
    console.log('✅ User schema defined');
  }
  
  // Define File schema if it doesn't exist
  if (!mongoose.models.File) {
    const FileSchema = new mongoose.Schema({
      title: { type: String, required: true },
      description: { type: String, required: true },
      fileType: { type: String, required: true },
      fileSize: { type: Number, required: true },
      fileName: { type: String, required: true },
      filePath: { type: String, required: true },
      fileContent: { type: String, required: true }, // Base64 encoded file content
      uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      branch: { type: String, required: true },
      year: { type: String, required: true },
      subject: { type: String, required: true },
      type: { 
        type: String, 
        enum: ['Notes', 'Question Paper (PYQ)', 'Lab Manual', 'Project'],
        default: 'Notes'
      },
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      downloads: { type: Number, default: 0 },
      createdAt: { type: Date, default: Date.now }
    });
    mongoose.model('File', FileSchema);
    console.log('✅ File schema defined');
  }
  
  // Define StudyMaterial schema if it doesn't exist
  if (!mongoose.models.StudyMaterial) {
    const StudyMaterialSchema = new mongoose.Schema({
      title: { type: String, required: true, trim: true },
      description: { type: String, trim: true },
      filename: { type: String, required: true },
      filePath: { type: String, required: true },
      fileSize: { type: Number, required: true },
      fileType: { type: String, required: true },
      fileContent: { type: String, required: true }, // Base64 encoded content
      courseCode: { type: String, trim: true },
      branch: { type: String, required: true },
      year: { type: String, required: true },
      semester: { type: String },
      subject: { type: String, required: true },
      materialType: { 
        type: String, 
        enum: ['Notes', 'Question Paper (PYQ)', 'Lab Manual', 'Project'],
        default: 'Notes'
      },
      tags: [{ type: String, trim: true }],
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      bookmarkedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
      },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      downloadCount: { type: Number, default: 0 },
      viewCount: { type: Number, default: 0 },
      rating: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 },
        ratings: [{
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          value: { type: Number, min: 1, max: 5 },
          comment: String,
          date: { type: Date, default: Date.now }
        }]
      },
      createdAt: { type: Date, default: Date.now }
    }, { timestamps: true });
    
    // Add text index for search functionality
    StudyMaterialSchema.index({ 
      title: 'text', 
      description: 'text', 
      subject: 'text',
      tags: 'text'
    });
    
    mongoose.model('StudyMaterial', StudyMaterialSchema);
    console.log('✅ StudyMaterial schema defined');
  }
  
  // Define Message schema if it doesn't exist
  if (!mongoose.models.Message) {
    const MessageSchema = new mongoose.Schema({
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      group: { type: String },
      content: { type: String },
      attachment: {
        fileName: String,
        fileType: String,
        fileSize: Number,
        fileContent: String
      },
      reactions: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reaction: { type: String, enum: ['like', 'love', 'laugh', 'sad', 'angry'] }
      }],
      readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      createdAt: { type: Date, default: Date.now }
    });
    mongoose.model('Message', MessageSchema);
    console.log('✅ Message schema defined');
  }
  
  // Define Chat schema if it doesn't exist
  if (!mongoose.models.Chat) {
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
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }, { timestamps: true });

    // Add index on createdAt for efficient sorting by latest messages
    ChatSchema.index({ createdAt: -1 });

    mongoose.model('Chat', ChatSchema);
    console.log('✅ Chat schema defined');
  }
  
  console.log('✅ All schemas defined successfully');
};

// Helper functions for local storage
export const LocalStorage = {
  // Read data from local storage
  readData: (fileName) => {
    try {
      const filePath = path.join(LOCAL_STORAGE_PATH, fileName);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading ${fileName}:`, error);
      return null;
    }
  },
  
  // Write data to local storage
  writeData: (fileName, data) => {
    try {
      const filePath = path.join(LOCAL_STORAGE_PATH, fileName);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Error writing ${fileName}:`, error);
      return false;
    }
  },
  
  // Save file content to disk
  saveFile: (fileDir, fileName, fileContent) => {
    try {
      const dirPath = path.join(LOCAL_STORAGE_PATH, fileDir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // Remove data:*/*;base64, prefix if present
      let content = fileContent;
      if (fileContent.includes('base64,')) {
        content = fileContent.split('base64,')[1];
      }
      
      const filePath = path.join(dirPath, fileName);
      fs.writeFileSync(filePath, content, 'base64');
      return true;
    } catch (error) {
      console.error(`Error saving file ${fileName}:`, error);
      return false;
    }
  },
  
  // Get file content from disk
  getFile: (fileDir, fileName) => {
    try {
      const filePath = path.join(LOCAL_STORAGE_PATH, fileDir, fileName);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const content = fs.readFileSync(filePath, { encoding: 'base64' });
      return content;
    } catch (error) {
      console.error(`Error reading file ${fileName}:`, error);
      return null;
    }
  }
};

// Export the connect function and local storage flag
export default connectToDatabase; 