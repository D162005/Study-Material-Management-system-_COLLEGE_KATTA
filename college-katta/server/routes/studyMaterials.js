import express from 'express';
import StudyMaterial from '../models/StudyMaterial.js';
import { createError } from '../utils/error.js';
import { verifyToken, verifyAdmin } from '../middlewares/authMiddleware.js';
import { usingLocalStorage, LocalStorage } from '../setupDatabase.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { formatYearToText } from '../utils/formatUtils.js';

const router = express.Router();

// Helper functions for local storage
const getLocalMaterials = () => {
  const data = LocalStorage.readData('study_materials.json');
  return data?.materials || [];
};

const saveLocalMaterials = (materials) => {
  return LocalStorage.writeData('study_materials.json', { materials });
};

// Upload new study material (authenticated users)
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { 
      title, 
      description, 
      branch, 
      year, 
      semester,
      subject, 
      materialType, 
      courseCode,
      tags,
      fileContent, 
      fileType, 
      fileSize,
      fileSizeBytes, // Add support for explicit byte size
      fileName 
    } = req.body;
    
    console.log('Study material upload attempt by user:', req.user.id);
    console.log('Material details:', { title, branch, year, subject, materialType, fileType });
    
    // Validate required fields
    if (!title || !branch || !year || !subject) {
      return next(createError(400, 'Missing required fields'));
    }
    
    if (!fileContent) {
      return next(createError(400, 'File content is required'));
    }
    
    // Validate material type
    const validMaterialTypes = ['Notes', 'Question Paper (PYQ)', 'Lab Manual', 'Project'];
    if (!materialType || !validMaterialTypes.includes(materialType)) {
      console.warn(`Invalid material type: ${materialType}. Defaulting to Notes.`);
      req.body.materialType = 'Notes';
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
    
    console.log('Material size processed:', fileSize, '→', processedFileSize, 'bytes');
    
    // If using local storage, handle the file locally
    if (usingLocalStorage) {
      console.log('Using local storage for file upload');
      
      // Generate a unique ID
      const materialId = uuidv4();
      const safeFileName = `${Date.now()}_${title.replace(/\s+/g, '_')}.${fileType || 'pdf'}`;
      const filePath = `study_materials/${materialId}/${safeFileName}`;
      
      // Save the file to local storage
      const saved = LocalStorage.saveFile('study_materials', safeFileName, fileContent);
      if (!saved) {
        return next(createError(500, 'Failed to save file'));
      }
      
      // Create material object
      const newMaterial = {
        _id: materialId,
        title,
        description: description || '',
        filename: fileName || safeFileName,
        filePath,
        fileSize: processedFileSize, // Use processed size
        fileType: fileType || 'pdf',
        courseCode: courseCode || '',
        branch,
        year: formattedYear,
        semester: semester || '',
        subject,
        materialType: req.body.materialType, // Use the validated material type
        tags: tags || [],
        uploadedBy: req.user.id,
        bookmarkedBy: [],
        status: 'pending',
        downloadCount: 0,
        viewCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Get existing materials and add the new one
      const materials = getLocalMaterials();
      materials.unshift(newMaterial);
      saveLocalMaterials(materials);
      
      console.log('Study material uploaded to local storage, ID:', materialId);
      
      // Don't send the file content back to save bandwidth
      const responseMaterial = { ...newMaterial };
      delete responseMaterial.fileContent;
      
      return res.status(201).json({
        success: true,
        message: 'Study material uploaded successfully and pending approval',
        material: responseMaterial,
        isUsingLocalStorage: true
      });
    }
    
    // MongoDB storage (normal flow)
    // Create new study material document
    const newMaterial = new StudyMaterial({
      title,
      description: description || '',
      filename: fileName || `${title.replace(/\s+/g, '_')}.${fileType || 'pdf'}`,
      filePath: `/uploads/study-materials/${Date.now()}_${title.replace(/\s+/g, '_')}.${fileType || 'pdf'}`,
      fileSize: processedFileSize, // Use processed size
      fileType: fileType || 'pdf',
      fileContent, // Store the base64 file content
      courseCode: courseCode || '',
      branch,
      year: formattedYear,
      semester: semester || '',
      subject,
      materialType: req.body.materialType, // Use the validated material type
      tags: tags || [],
      uploadedBy: req.user.id
    });
    
    // Save study material to database
    const savedMaterial = await newMaterial.save();
    console.log('Study material uploaded successfully, ID:', savedMaterial._id);
    
    // Remove file content from response to reduce payload size
    const materialResponse = savedMaterial.toObject();
    delete materialResponse.fileContent;
    
    res.status(201).json({
      success: true,
      message: 'Study material uploaded successfully and pending approval',
      material: materialResponse,
      isUsingLocalStorage: false
    });
  } catch (error) {
    console.error('Error uploading study material:', error);
    next(error);
  }
});

// Get all study materials based on status and filters
router.get('/', async (req, res, next) => {
  try {
    const { 
      status = 'approved',  // default to approved materials for public
      branch, year, semester, subject, materialType, search, 
      limit = 20, page = 1,
      sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;
    
    console.log('Getting study materials with status:', status);
    
    // If using local storage, handle filtering locally
    if (usingLocalStorage) {
      console.log('Using local storage for fetching materials');
      
      let materials = getLocalMaterials();
      
      // Filter by status
      materials = materials.filter(material => material.status === status);
      
      // Apply additional filters
      if (branch) materials = materials.filter(material => material.branch === branch);
      if (year) materials = materials.filter(material => material.year === year);
      if (semester) materials = materials.filter(material => material.semester === semester);
      if (subject) materials = materials.filter(material => material.subject === subject);
      if (materialType) materials = materials.filter(material => material.materialType === materialType);
      
      // Apply search
      if (search) {
        const searchLower = search.toLowerCase();
        materials = materials.filter(material => 
          material.title.toLowerCase().includes(searchLower) ||
          material.description.toLowerCase().includes(searchLower) ||
          material.subject.toLowerCase().includes(searchLower) ||
          (material.tags && material.tags.some(tag => tag.toLowerCase().includes(searchLower)))
        );
      }
      
      // Sort materials
      materials.sort((a, b) => {
        if (a[sortBy] < b[sortBy]) return sortOrder === 'asc' ? -1 : 1;
        if (a[sortBy] > b[sortBy]) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
      
      // Pagination
      const total = materials.length;
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      materials = materials.slice(startIndex, endIndex);
      
      // Remove file content
      materials = materials.map(material => {
        const { fileContent, ...rest } = material;
        return rest;
      });
      
      console.log(`Found ${materials.length} study materials out of ${total} total (local storage)`);
      
      return res.status(200).json({
        success: true,
        count: materials.length,
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        currentPage: parseInt(page),
        materials
      });
    }
    
    // MongoDB query (normal flow)
    const query = { status };
    
    // Add filters if they exist
    if (branch) query.branch = branch;
    if (year) query.year = year;
    if (semester) query.semester = semester;
    if (subject) query.subject = subject;
    if (materialType) query.materialType = materialType;
    
    // Add search functionality
    if (search) {
      query.$text = { $search: search };
    }
    
    // For admin, allow viewing all status types
    if (req.user?.isAdmin && req.query.status) {
      query.status = req.query.status;
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    console.log('Study material query:', JSON.stringify(query));
    
    // Set up sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Get study materials but exclude the file content
    const materials = await StudyMaterial.find(query)
      .select('-fileContent')
      .populate('uploadedBy', 'username email fullName')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const total = await StudyMaterial.countDocuments(query);
    
    console.log(`Found ${materials.length} study materials out of ${total} total`);
    
    res.status(200).json({
      success: true,
      count: materials.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      materials
    });
  } catch (error) {
    console.error('Error getting study materials:', error);
    next(error);
  }
});

// Get study materials uploaded by current user
router.get('/my-uploads', verifyToken, async (req, res, next) => {
  try {
    console.log('Getting uploads for user:', req.user.id);
    
    // If using local storage, filter materials by user
    if (usingLocalStorage) {
      let materials = getLocalMaterials();
      
      // Filter by user ID
      materials = materials.filter(material => material.uploadedBy === req.user.id);
      
      // Sort by creation date (newest first)
      materials.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Remove file content
      materials = materials.map(material => {
        const { fileContent, ...rest } = material;
        return rest;
      });
      
      console.log(`Found ${materials.length} uploads for user (local storage)`);
      
      return res.status(200).json({
        success: true,
        count: materials.length,
        materials
      });
    }
    
    // MongoDB query (normal flow)
    const materials = await StudyMaterial.find({ uploadedBy: req.user.id })
      .select('-fileContent')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${materials.length} uploads for user`);
    
    res.status(200).json({
      success: true,
      count: materials.length,
      materials
    });
  } catch (error) {
    console.error('Error getting user uploads:', error);
    next(error);
  }
});

// Get bookmarked study materials for current user
router.get('/bookmarks', verifyToken, async (req, res, next) => {
  try {
    console.log('Getting bookmarks for user:', req.user.id);
    
    // If using local storage, filter materials by bookmarks
    if (usingLocalStorage) {
      let materials = getLocalMaterials();
      
      // Filter by user bookmarks and approved status
      materials = materials.filter(material => 
        material.bookmarkedBy && 
        material.bookmarkedBy.includes(req.user.id) &&
        material.status === 'approved'
      );
      
      // Sort by creation date (newest first)
      materials.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Remove file content
      materials = materials.map(material => {
        const { fileContent, ...rest } = material;
        return rest;
      });
      
      console.log(`Found ${materials.length} bookmarks for user (local storage)`);
      
      return res.status(200).json({
        success: true,
        count: materials.length,
        materials
      });
    }
    
    // MongoDB query (normal flow)
    const materials = await StudyMaterial.find({ 
      bookmarkedBy: req.user.id, 
      status: 'approved' 
    })
      .select('-fileContent')
      .populate('uploadedBy', 'username email fullName')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${materials.length} bookmarks for user`);
    
    res.status(200).json({
      success: true,
      count: materials.length,
      materials
    });
  } catch (error) {
    console.error('Error getting bookmarks:', error);
    next(error);
  }
});

// Toggle bookmark for a study material
router.post('/:id/bookmark', verifyToken, async (req, res, next) => {
  try {
    const materialId = req.params.id;
    console.log('Toggle bookmark for material:', materialId, 'by user:', req.user.id);
    
    // If using local storage, handle bookmarks locally
    if (usingLocalStorage) {
      let materials = getLocalMaterials();
      
      // Find the material
      const materialIndex = materials.findIndex(m => m._id === materialId);
      if (materialIndex === -1) {
        return next(createError(404, 'Study material not found'));
      }
      
      // Check if already bookmarked
      const material = materials[materialIndex];
      const bookmarked = material.bookmarkedBy && material.bookmarkedBy.includes(req.user.id);
      
      // Toggle bookmark
      if (bookmarked) {
        // Remove bookmark
        material.bookmarkedBy = material.bookmarkedBy.filter(id => id !== req.user.id);
      } else {
        // Add bookmark
        if (!material.bookmarkedBy) {
          material.bookmarkedBy = [];
        }
        material.bookmarkedBy.push(req.user.id);
      }
      
      // Update materials
      materials[materialIndex] = material;
      saveLocalMaterials(materials);
      
      return res.status(200).json({
        success: true,
        message: bookmarked ? 'Bookmark removed' : 'Bookmark added',
        isBookmarked: !bookmarked
      });
    }
    
    // MongoDB query (normal flow)
    const material = await StudyMaterial.findById(materialId);
    
    if (!material) {
      return next(createError(404, 'Study material not found'));
    }
    
    // Check if material is already bookmarked by user
    const isBookmarked = material.bookmarkedBy.includes(req.user.id);
    console.log('Currently bookmarked:', isBookmarked);
    
    if (isBookmarked) {
      // Remove bookmark
      material.bookmarkedBy = material.bookmarkedBy.filter(
        id => id.toString() !== req.user.id.toString()
      );
    } else {
      // Add bookmark
      material.bookmarkedBy.push(req.user.id);
    }
    
    // Save changes
    await material.save();
    
    res.status(200).json({
      success: true,
      message: isBookmarked ? 'Bookmark removed' : 'Bookmark added',
      isBookmarked: !isBookmarked
    });
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    next(error);
  }
});

// Get study material by ID
router.get('/:id', async (req, res, next) => {
  try {
    const materialId = req.params.id;
    console.log('Getting study material details for:', materialId);
    
    // If using local storage, find by ID
    if (usingLocalStorage) {
      const materials = getLocalMaterials();
      const material = materials.find(m => m._id === materialId);
      
      if (!material) {
        return next(createError(404, 'Study material not found'));
      }
      
      // Increment view count
      material.viewCount = (material.viewCount || 0) + 1;
      saveLocalMaterials(materials);
      
      // Remove file content
      const { fileContent, ...materialResponse } = material;
      
      console.log('Study material details fetched from local storage, views:', material.viewCount);
      
      return res.status(200).json({
        success: true,
        material: materialResponse
      });
    }
    
    // MongoDB query (normal flow)
    const material = await StudyMaterial.findById(materialId)
      .select('-fileContent')
      .populate('uploadedBy', 'username email fullName');
    
    if (!material) {
      return next(createError(404, 'Study material not found'));
    }
    
    // Increment view count
    material.viewCount += 1;
    await material.save();
    
    console.log('Study material details fetched successfully, views:', material.viewCount);
    
    res.status(200).json({
      success: true,
      material
    });
  } catch (error) {
    console.error('Error getting study material details:', error);
    next(error);
  }
});

// Download study material
router.get('/:id/download', verifyToken, async (req, res, next) => {
  try {
    const materialId = req.params.id;
    console.log('Downloading study material:', materialId);
    console.log('User authenticated:', req.user.id);
    
    // If using local storage, handle download
    if (usingLocalStorage) {
      const materials = getLocalMaterials();
      const material = materials.find(m => m._id === materialId);
      
      if (!material) {
        return next(createError(404, 'Study material not found'));
      }
      
      // Get file content from local storage
      const fileContent = LocalStorage.getFile('study_materials', material.filename);
      if (!fileContent) {
        return next(createError(404, 'File content not found'));
      }
      
      // Increment download count
      material.downloadCount = (material.downloadCount || 0) + 1;
      saveLocalMaterials(materials);
      
      console.log('Study material downloaded successfully, downloads:', material.downloadCount);
      
      // Respond with file content
      return res.status(200).json({
        success: true,
        fileContent: `data:${getMimeType(material.fileType)};base64,${fileContent}`,
        fileName: material.filename,
        fileType: material.fileType
      });
    }
    
    // MongoDB query (normal flow)
    const material = await StudyMaterial.findById(materialId);
    
    if (!material) {
      return next(createError(404, 'Study material not found'));
    }
    
    // Increment download count
    material.downloadCount += 1;
    await material.save();
    
    console.log('Study material downloaded successfully, downloads:', material.downloadCount);
    
    res.status(200).json({
      success: true,
      fileContent: material.fileContent,
      fileName: material.filename,
      fileType: material.fileType
    });
  } catch (error) {
    console.error('Error downloading study material:', error);
    next(error);
  }
});

// Update study material status (admin only)
router.patch('/:id/status', verifyToken, verifyAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    const materialId = req.params.id;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return next(createError(400, 'Invalid status value'));
    }
    
    console.log(`Updating study material ${materialId} status to ${status}`);
    
    // If using local storage, update status
    if (usingLocalStorage) {
      const materials = getLocalMaterials();
      const materialIndex = materials.findIndex(m => m._id === materialId);
      
      if (materialIndex === -1) {
        return next(createError(404, 'Study material not found'));
      }
      
      // Update status
      materials[materialIndex].status = status;
      materials[materialIndex].approvedBy = req.user.id;
      materials[materialIndex].updatedAt = new Date().toISOString();
      
      saveLocalMaterials(materials);
      
      // Remove file content
      const { fileContent, ...materialResponse } = materials[materialIndex];
      
      console.log('Study material status updated in local storage');
      
      return res.status(200).json({
        success: true,
        message: `Study material ${status} successfully`,
        material: materialResponse
      });
    }
    
    // MongoDB query (normal flow)
    const material = await StudyMaterial.findByIdAndUpdate(
      materialId,
      { 
        status,
        approvedBy: req.user.id,
        updatedAt: new Date()
      },
      { new: true }
    ).select('-fileContent');
    
    if (!material) {
      return next(createError(404, 'Study material not found'));
    }
    
    console.log('Study material status updated successfully');
    
    res.status(200).json({
      success: true,
      message: `Study material ${status} successfully`,
      material
    });
  } catch (error) {
    console.error('Error updating study material status:', error);
    next(error);
  }
});

// Helper function to get MIME type from file extension
function getMimeType(fileType) {
  const mimeTypes = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'txt': 'text/plain',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed'
  };
  
  return mimeTypes[fileType.toLowerCase()] || 'application/octet-stream';
}

export default router; 