import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Create personal files directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const personalFilesDir = path.join(__dirname, '../uploads/personal-files');

if (!fs.existsSync(personalFilesDir)) {
  fs.mkdirSync(personalFilesDir, { recursive: true });
}

// Configure storage for personal files
const personalFileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user.id;
    const userDir = path.join(personalFilesDir, userId);
    
    // Create user-specific directory if it doesn't exist
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename to prevent overwriting
    const uniqueFilename = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueFilename);
  }
});

// File filter for personal files
const personalFileFilter = (req, file, cb) => {
  // Allow only specific file types
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/zip',
    'application/vnd.rar',
    'application/x-7z-compressed'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed. Please upload a document, image, or archive file.'), false);
  }
};

// Create upload middleware for personal files
export const uploadPersonalFile = multer({
  storage: personalFileStorage,
  fileFilter: personalFileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB file size limit
  }
});

export default uploadPersonalFile; 