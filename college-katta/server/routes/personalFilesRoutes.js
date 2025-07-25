const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const personalFilesController = require('../controllers/personalFilesController');

// Get files and folders in a directory
router.get('/list/:folderId?', protect, personalFilesController.getFilesAndFolders);

// Create a new folder
router.post('/folders', protect, personalFilesController.createFolder);

// Upload file
router.post(
  '/upload/:folderId?', 
  protect, 
  upload.single('file'), 
  personalFilesController.uploadFile
);

// Download file
router.get('/download/:fileId', protect, personalFilesController.downloadFile);

// Delete files and folders
router.delete('/delete', protect, personalFilesController.deleteItems);

// Rename file or folder
router.put('/rename/:itemId', protect, personalFilesController.renameItem);

// Move items to another folder
router.put('/move', protect, personalFilesController.moveItems);

module.exports = router; 