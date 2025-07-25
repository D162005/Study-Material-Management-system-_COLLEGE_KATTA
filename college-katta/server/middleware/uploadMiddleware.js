import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

console.log('Initializing upload middleware...');

// Set up file storage
let __filename, __dirname, uploadsDir;

try {
  __filename = fileURLToPath(import.meta.url);
  __dirname = dirname(__filename);
  uploadsDir = path.join(__dirname, '..', 'uploads', 'personal');
  
  console.log('Upload directory path:', uploadsDir);
  
  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    console.log('Creating uploads directory...');
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Upload directory created successfully');
  } else {
    console.log('Upload directory already exists');
  }
} catch (error) {
  console.error('Error setting up upload directory:', error);
  // Create a fallback directory
  try {
    uploadsDir = path.resolve('./server/uploads/personal');
    console.log('Using fallback upload directory:', uploadsDir);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  } catch (fallbackError) {
    console.error('Failed to create fallback upload directory:', fallbackError);
    // Last resort
    uploadsDir = './uploads';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
  }
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('Processing file upload, destination:', uploadsDir);
    // Create directory if it doesn't exist (redundant but safe)
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueFilename = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    console.log('Generated filename for upload:', uniqueFilename);
    cb(null, uniqueFilename);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  console.log('Filtering file:', file.originalname, 'MIME type:', file.mimetype);
  // Allow only safe file types
  const allowedFileTypes = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.rtf', '.csv', '.zip', '.rar', '.jpg', '.jpeg', '.png', '.gif'
  ];
  
  const ext = path.extname(file.originalname).toLowerCase();
  console.log('File extension:', ext);
  
  if (allowedFileTypes.includes(ext)) {
    console.log('File type allowed');
    cb(null, true); // Accept file
  } else {
    console.log('File type not allowed');
    cb(new Error(`File type ${ext} is not allowed`), false);
  }
};

// Enhanced error handling for multer
const handleMulterError = (err, req, res, next) => {
  console.error('Multer error:', err);
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File too large. Maximum file size is 10MB.'
      });
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({
        success: false,
        message: 'Too many files. Maximum is 5 files per upload.'
      });
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name in form upload.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`
    });
  } else if (err) {
    // Non-multer error
    return res.status(500).json({
      success: false,
      message: `Server error during file upload: ${err.message}`
    });
  }
  // No error, continue
  next();
};

// Configure multer upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 5 // Max 5 files per upload
  },
  fileFilter: fileFilter
});

console.log('Upload middleware initialized successfully');

export { upload, handleMulterError };
export default upload; 