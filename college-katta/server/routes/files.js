import express from 'express';
import File from '../models/File.js';
import { createError } from '../utils/error.js';
import { verifyToken, verifyAdmin } from '../middlewares/authMiddleware.js';
import { formatYearToText } from '../utils/formatUtils.js';

const router = express.Router();

// Upload new file (authenticated users)
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { 
      title, 
      description, 
      branch, 
      year, 
      subject, 
      type, 
      fileContent, 
      fileType, 
      fileSize,
      fileSizeBytes, // Add support for explicit byte size
      fileName 
    } = req.body;
    
    console.log('File upload attempt by user:', req.user.id);
    console.log('File details:', { title, branch, year, subject, type, fileType, fileName });
    
    if (!title || !branch || !year || !subject) {
      return next(createError(400, 'Missing required fields'));
    }
    
    if (!fileContent) {
      return next(createError(400, 'File content is required'));
    }
    
    // Validate file type
    const validTypes = ['Notes', 'Question Paper (PYQ)', 'Lab Manual', 'Project'];
    if (!type || !validTypes.includes(type)) {
      console.warn(`Invalid file type: ${type}. Defaulting to Notes.`);
      req.body.type = 'Notes';
    }
    
    // Format year to ensure consistency
    const formattedYear = formatYearToText(year);
    
    // Process file size - ensure it's a number
    let processedFileSize;
    
    // Use the explicit byte size if available
    if (fileSizeBytes && !isNaN(fileSizeBytes)) {
      processedFileSize = Number(fileSizeBytes);
    } 
    // Try to convert fileSize if it's a formatted string
    else if (typeof fileSize === 'string') {
      // Try to extract the number from the formatted string
      const sizeMatch = fileSize.match(/^([\d.]+)\s*(bytes|KB|MB|GB)?$/i);
      if (sizeMatch) {
        const value = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2]?.toLowerCase();
        
        if (unit === 'kb') {
          processedFileSize = Math.round(value * 1024);
        } else if (unit === 'mb') {
          processedFileSize = Math.round(value * 1024 * 1024);
        } else if (unit === 'gb') {
          processedFileSize = Math.round(value * 1024 * 1024 * 1024);
        } else {
          processedFileSize = value; // bytes
        }
      } else {
        // Default to fileContent length if we can't parse
        processedFileSize = fileContent.length;
      }
    } 
    // If fileSize is already a number, use it
    else if (!isNaN(fileSize)) {
      processedFileSize = Number(fileSize);
    } 
    // Last resort, use the length of the content
    else {
      processedFileSize = fileContent.length;
    }
    
    console.log('File size processed:', fileSize, '→', processedFileSize, 'bytes');
    
    // Create new file document
    const newFile = new File({
      title,
      description: description || '',
      filename: fileName || `${title.replace(/\s+/g, '_')}.${fileType || 'pdf'}`,
      filePath: `/uploads/${Date.now()}_${title.replace(/\s+/g, '_')}.${fileType || 'pdf'}`,
      fileSize: processedFileSize, // Now a number in bytes
      fileType: fileType || 'pdf',
      fileContent, // Store the base64 file content
      branch,
      year: formattedYear,
      subject,
      type: req.body.type,
      uploadedBy: req.user.id
    });
    
    // Save file to database
    const savedFile = await newFile.save();
    console.log('File uploaded successfully, ID:', savedFile._id);
    
    // Remove file content from response to reduce payload size
    const fileResponse = savedFile.toObject();
    delete fileResponse.fileContent;
    
    res.status(201).json({
      success: true,
      message: 'File uploaded successfully and pending approval',
      file: fileResponse
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    next(error);
  }
});

// Get all files based on status and filters
router.get('/', async (req, res, next) => {
  try {
    const { 
      status = 'approved',  // default to approved files for public
      branch, year, subject, type, search, 
      limit = 20, 
      page = 1,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    console.log('Getting files with status:', status);
    const query = { status };
    
    // Add filters if they exist
    if (branch) query.branch = branch;
    if (year) query.year = year;
    if (subject) query.subject = subject;
    if (type) query.type = type;
    
    // Add search functionality using text index
    if (search) {
      query.$text = { $search: search };
    }
    
    // For admin, allow viewing all status types
    if (req.user?.isAdmin && req.query.status) {
      query.status = req.query.status;
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    console.log('File query:', JSON.stringify(query));
    
    // Set up sorting options
    const sortOptions = {};
    if (search) {
      // If searching, sort by text score first
      sortOptions.score = { $meta: 'textScore' };
    }
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Get files but exclude the file content
    const filesQuery = File.find(query)
      .select('-fileContent')
      .populate('uploadedBy', 'username email fullName')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .allowDiskUse(true); // Allow using disk for large sorts
    
    // If searching, include the text score
    if (search) {
      filesQuery.select({ score: { $meta: 'textScore' } });
    }
    
    const [files, total] = await Promise.all([
      filesQuery.exec(),
      File.countDocuments(query)
    ]);
    
    console.log(`Found ${files.length} files out of ${total} total`);
    
    res.status(200).json({
      success: true,
      count: files.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      files
    });
  } catch (error) {
    console.error('Error getting files:', error);
    next(error);
  }
});

// Get files uploaded by current user
router.get('/my-uploads', verifyToken, async (req, res, next) => {
  try {
    console.log('Getting uploads for user:', req.user.id);
    
    const { page = 1, limit = 20, sortOrder = 'desc' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [files, total] = await Promise.all([
      File.find({ uploadedBy: req.user.id })
        .select('-fileContent')
        .sort({ createdAt: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .allowDiskUse(true),
      File.countDocuments({ uploadedBy: req.user.id })
    ]);
    
    console.log(`Found ${files.length} uploads for user out of ${total} total`);
    
    res.status(200).json({
      success: true,
      count: files.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      files
    });
  } catch (error) {
    console.error('Error getting user uploads:', error);
    next(error);
  }
});

// Get bookmarked files for current user
router.get('/bookmarks', verifyToken, async (req, res, next) => {
  try {
    console.log('Getting bookmarks for user:', req.user.id);
    
    const { page = 1, limit = 20, sortOrder = 'desc' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const query = { 
      bookmarkedBy: req.user.id, 
      status: 'approved' 
    };
    
    const [files, total] = await Promise.all([
      File.find(query)
        .select('-fileContent')
        .populate('uploadedBy', 'username email fullName')
        .sort({ createdAt: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .allowDiskUse(true),
      File.countDocuments(query)
    ]);
    
    console.log(`Found ${files.length} bookmarks for user out of ${total} total`);
    
    res.status(200).json({
      success: true,
      count: files.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      files
    });
  } catch (error) {
    console.error('Error getting bookmarks:', error);
    next(error);
  }
});

// Toggle bookmark for a file
router.post('/:id/bookmark', verifyToken, async (req, res, next) => {
  try {
    console.log('Toggle bookmark for file:', req.params.id, 'by user:', req.user.id);
    
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return next(createError(404, 'File not found'));
    }
    
    // Check if file is already bookmarked by user
    const isBookmarked = file.bookmarkedBy.includes(req.user.id);
    console.log('Currently bookmarked:', isBookmarked);
    
    if (isBookmarked) {
      // Remove bookmark
      file.bookmarkedBy = file.bookmarkedBy.filter(
        id => id.toString() !== req.user.id.toString()
      );
    } else {
      // Add bookmark
      file.bookmarkedBy.push(req.user.id);
    }
    
    await file.save();
    console.log('Bookmark toggled successfully');
    
    res.status(200).json({
      success: true,
      isBookmarked: !isBookmarked,
      message: isBookmarked ? 'Bookmark removed' : 'File bookmarked'
    });
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    next(error);
  }
});

// Download file (increment download counter)
router.get('/:id/download', verifyToken, async (req, res, next) => {
  try {
    console.log('Download request for file:', req.params.id);
    console.log('User authenticated:', req.user.id);
    
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return next(createError(404, 'File not found'));
    }
    
    // Only approved files can be downloaded
    if (file.status !== 'approved' && !req.user?.isAdmin) {
      return next(createError(403, 'This file cannot be downloaded'));
    }
    
    // Increment download counter
    file.downloadCount += 1;
    await file.save();
    
    console.log('File download successful, new count:', file.downloadCount);
    
    // Send file data including content
    res.status(200).json({
      success: true,
      message: 'File download initiated',
      downloadUrl: file.filePath, 
      fileContent: file.fileContent,
      fileType: file.fileType,
      fileName: file.filename,
      file: {
        _id: file._id,
        title: file.title,
        description: file.description,
        fileType: file.fileType,
        fileSize: file.fileSize,
        downloadCount: file.downloadCount
      }
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    next(error);
  }
});

// Get file by ID
router.get('/:id', async (req, res, next) => {
  try {
    console.log('Getting file details for:', req.params.id);
    
    const file = await File.findById(req.params.id)
      .select('-fileContent')
      .populate('uploadedBy', 'username email fullName');
    
    if (!file) {
      return next(createError(404, 'File not found'));
    }
    
    console.log('File details fetched successfully');
    
    res.status(200).json({
      success: true,
      file
    });
  } catch (error) {
    console.error('Error getting file details:', error);
    next(error);
  }
});

// Update file status (admin only)
router.patch('/:id/status', verifyToken, verifyAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    
    console.log('File status update attempt:', req.params.id, 'New status:', status);
    
    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return next(createError(400, 'Invalid status value'));
    }
    
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return next(createError(404, 'File not found'));
    }
    
    // Update status
    file.status = status;
    
    // If approving, set approved by
    if (status === 'approved') {
      file.approvedBy = req.user.id;
    }
    
    await file.save();
    console.log('File status updated successfully');
    
    // Get updated file without content
    const updatedFile = await File.findById(req.params.id)
      .select('-fileContent')
      .populate('uploadedBy', 'username email fullName');
    
    res.status(200).json({
      success: true,
      message: `File ${status} successfully`,
      file: updatedFile
    });
  } catch (error) {
    console.error('Error updating file status:', error);
    next(error);
  }
});

// Delete file (admin or owner)
router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    console.log('File deletion attempt:', req.params.id);
    
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return next(createError(404, 'File not found'));
    }
    
    // Check if user is file owner or admin
    if (file.uploadedBy.toString() !== req.user.id && !req.user.isAdmin) {
      return next(createError(403, 'You are not authorized to delete this file'));
    }
    
    await File.findByIdAndDelete(req.params.id);
    console.log('File deleted successfully');
    
    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    next(error);
  }
});

export default router; 