import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { upload, handleMulterError } from '../middleware/uploadMiddleware.js';
import * as personalFilesController from '../controllers/personalFilesController.js';

const router = express.Router();

// Get files and folders in a directory
router.get('/list/:folderId?', protect, personalFilesController.getFilesAndFolders);

// Create a new folder
router.post('/folders', protect, personalFilesController.createFolder);

// Upload file - add error handler middleware
router.post(
  '/upload/:folderId?', 
  protect, 
  (req, res, next) => {
    console.log('Processing upload request for folder:', req.params.folderId || 'root');
    next();
  },
  upload.array('files', 5),
  handleMulterError,
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

// Legacy routes to maintain backward compatibility
router.get('/', protect, (req, res, next) => {
  req.params.folderId = null;
  personalFilesController.getFilesAndFolders(req, res, next);
});

// This route needs to be after specific routes to avoid conflicts
router.get('/:id', protect, (req, res) => {
  const fileId = req.params.id;
  req.params.fileId = fileId;
  personalFilesController.downloadFile(req, res);
});

export default router; 