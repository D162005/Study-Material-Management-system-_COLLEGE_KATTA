import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import PersonalFile from '../models/PersonalFile.js';
import PersonalFolder from '../models/PersonalFolder.js';

// Helper functions
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const createUploadDir = () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const uploadDir = path.join(__dirname, '../uploads/personal');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
};

// Get all files and folders in a specific folder
export const getFilesAndFolders = async (req, res) => {
  try {
    console.log('getFilesAndFolders called');
    console.log('User:', req.user ? `ID: ${req.user.id}` : 'Not authenticated');
    console.log('Params:', req.params);
    
    const { folderId } = req.params;
    
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      console.error('User not authenticated');
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const userId = req.user.id;
    console.log(`Processing request for user: ${userId}, folder: ${folderId || 'root'}`);
    
    // Validate folder if provided
    if (folderId && folderId !== 'root' && !isValidObjectId(folderId)) {
      console.error('Invalid folder ID:', folderId);
      return res.status(400).json({ success: false, message: 'Invalid folder ID' });
    }

    let parentFolder = folderId === 'root' || !folderId ? null : folderId;
    
    // Check if folderId is provided and not 'root', verify the folder exists and belongs to user
    if (parentFolder) {
      console.log('Checking if folder exists:', parentFolder);
      const folderExists = await PersonalFolder.findOne({
        _id: parentFolder,
        userId
      });
      
      if (!folderExists) {
        console.error('Folder not found:', parentFolder);
        return res.status(404).json({ success: false, message: 'Folder not found' });
      }
      console.log('Folder found:', folderExists.name);
    }

    console.log('Fetching folders...');
    // Get folders
    const folders = await PersonalFolder.find({
      userId,
      parentFolder
    }).sort({ name: 1 });
    console.log(`Found ${folders.length} folders`);

    console.log('Fetching files...');
    // Get files
    const files = await PersonalFile.find({
      userId,
      parentFolder
    }).sort({ name: 1 });
    console.log(`Found ${files.length} files`);

    // Get breadcrumb data if folder is not root
    let breadcrumbs = [];
    if (parentFolder) {
      console.log('Generating breadcrumbs for folder:', parentFolder);
      breadcrumbs = await generateBreadcrumbs(parentFolder);
    } else {
      breadcrumbs = [{ id: 'root', name: 'My Files' }];
    }
    console.log('Breadcrumbs:', JSON.stringify(breadcrumbs));

    const response = {
      success: true,
      currentFolder: parentFolder,
      breadcrumbs,
      items: {
        folders,
        files
      }
    };
    console.log('Sending response with structure:', JSON.stringify({
      success: response.success,
      currentFolder: response.currentFolder,
      breadcrumbsCount: response.breadcrumbs.length,
      itemCounts: {
        folders: response.items.folders.length,
        files: response.items.files.length
      }
    }));
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in getFilesAndFolders:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Helper function to generate breadcrumbs
async function generateBreadcrumbs(folderId) {
  const breadcrumbs = [];
  let currentFolderId = folderId;

  while (currentFolderId) {
    const folder = await PersonalFolder.findById(currentFolderId);
    if (!folder) break;

    breadcrumbs.unshift({
      id: folder._id,
      name: folder.name
    });

    currentFolderId = folder.parentFolder;
  }

  // Add root at the beginning
  breadcrumbs.unshift({ id: 'root', name: 'My Files' });
  
  return breadcrumbs;
}

// Create a new folder
export const createFolder = async (req, res) => {
  try {
    const { name, parentFolder } = req.body;
    const userId = req.user.id;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Folder name is required' });
    }

    // Validate parentFolder if provided
    let parentFolderId = parentFolder === 'root' || !parentFolder ? null : parentFolder;
    
    if (parentFolderId && !isValidObjectId(parentFolderId)) {
      return res.status(400).json({ success: false, message: 'Invalid parent folder ID' });
    }

    if (parentFolderId) {
      const parentFolderExists = await PersonalFolder.findOne({
        _id: parentFolderId,
        userId
      });
      
      if (!parentFolderExists) {
        return res.status(404).json({ success: false, message: 'Parent folder not found' });
      }
    }

    // Check if folder with same name exists in the same location
    const existingFolder = await PersonalFolder.findOne({
      name: name.trim(),
      userId,
      parentFolder: parentFolderId
    });

    if (existingFolder) {
      return res.status(400).json({ success: false, message: 'A folder with this name already exists in this location' });
    }

    // Create new folder
    const newFolder = new PersonalFolder({
      name: name.trim(),
      userId,
      parentFolder: parentFolderId
    });

    await newFolder.save();
    return res.status(201).json({ success: true, folder: newFolder });
  } catch (error) {
    console.error('Error in createFolder:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Upload file
export const uploadFile = async (req, res) => {
  try {
    console.log('uploadFile controller called');
    console.log('Request body:', req.body);
    console.log('Received files:', req.files ? req.files.length : 'none');
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        console.log(`File ${index + 1}: ${file.originalname}, size: ${file.size}, mimetype: ${file.mimetype}`);
      });
    }
    
    const { title, subject, description, materialType } = req.body;
    console.log('Extracted form values:', { title, subject, description, materialType });
    
    const userId = req.user.id;
    const parentFolderId = req.params.folderId === 'root' ? null : req.params.folderId;
    console.log('User ID:', userId);
    console.log('Parent folder ID:', parentFolderId || 'root');

    // Check if folderId is valid if provided
    if (parentFolderId && !isValidObjectId(parentFolderId)) {
      console.error('Invalid parent folder ID:', parentFolderId);
      // Remove uploaded files if they exist
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(400).json({ success: false, message: 'Invalid parent folder ID' });
    }

    // Check if parent folder exists and belongs to user
    if (parentFolderId) {
      console.log('Checking parent folder:', parentFolderId);
      const parentFolder = await PersonalFolder.findOne({
        _id: parentFolderId,
        userId,
        isDeleted: false
      });

      if (!parentFolder) {
        console.error('Parent folder not found:', parentFolderId);
        // Remove uploaded files if they exist
        if (req.files && req.files.length > 0) {
          req.files.forEach(file => {
            if (file.path && fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        return res.status(404).json({ success: false, message: 'Parent folder not found' });
      }
      console.log('Parent folder verified:', parentFolder.name);
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      console.error('No files uploaded');
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const results = [];
    const errors = [];

    // Process each uploaded file
    for (const file of req.files) {
      try {
        console.log(`Processing file: ${file.originalname}`);
        // Check if a file with the same name already exists in the folder
        const existingFile = await PersonalFile.findOne({
          name: file.originalname,
          userId,
          parentFolder: parentFolderId,
          isDeleted: false
        });

        if (existingFile) {
          console.warn(`File already exists: ${file.originalname}`);
          // Delete the uploaded file
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
            console.log(`Deleted duplicate file from disk: ${file.path}`);
          }
          errors.push({ file: file.originalname, error: 'A file with this name already exists in this location' });
          continue;
        }

        // Create new file entry
        console.log(`Creating new file entry for: ${file.originalname}`);
        const newFile = new PersonalFile({
          name: file.originalname,
          title: title || file.originalname,
          subject: subject || 'Personal Study Material',
          description: description || '',
          materialType: materialType,
          fileType: file.mimetype,
          size: file.size,
          filePath: file.path,
          filename: file.filename,
          userId,
          parentFolder: parentFolderId
        });

        console.log('New file document:', newFile);
        await newFile.save();
        console.log(`File saved to database: ${newFile._id}`);
        results.push(newFile);
      } catch (fileError) {
        console.error('Error processing file:', file.originalname, fileError);
        // Clean up the file if it exists
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          console.log(`Deleted file due to error: ${file.path}`);
        }
        errors.push({ file: file.originalname, error: fileError.message });
      }
    }

    console.log(`Processing complete. Success: ${results.length}, Errors: ${errors.length}`);
    
    // Determine the response based on results
    if (results.length === 0 && errors.length > 0) {
      console.error('All uploads failed:', errors);
      return res.status(400).json({ 
        success: false, 
        message: 'All file uploads failed', 
        errors 
      });
    } else if (errors.length > 0) {
      // Some uploads succeeded, some failed
      console.warn('Some uploads failed:', errors);
      return res.status(207).json({ 
        success: true, 
        message: `${results.length} files uploaded, ${errors.length} failed`, 
        files: results,
        errors 
      });
    } else {
      // All uploads succeeded
      console.log('All uploads succeeded:', results.map(f => f._id));
      return res.status(201).json({ 
        success: true, 
        message: `Successfully uploaded ${results.length} files`,
        files: results 
      });
    }
  } catch (error) {
    console.error('Unhandled error in uploadFile:', error);
    // Remove the uploaded files if they exist
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          console.log(`Deleted file due to unhandled error: ${file.path}`);
        }
      });
    }
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Download a file
export const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    if (!isValidObjectId(fileId)) {
      return res.status(400).json({ success: false, message: 'Invalid file ID' });
    }

    const file = await PersonalFile.findOne({
      _id: fileId,
      userId,
      isDeleted: false
    });

    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Check if file exists on disk
    if (!fs.existsSync(file.filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    // Increment download count
    file.downloads += 1;
    await file.save();

    // Set content disposition and type headers
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Content-Type', file.fileType);
    res.setHeader('Content-Length', file.size);

    // Stream the file
    const fileStream = fs.createReadStream(file.filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error in downloadFile:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete files and folders
export const deleteItems = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { fileIds = [], folderIds = [] } = req.body;
    const userId = req.user.id;

    if (fileIds.length === 0 && folderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No items to delete' });
    }

    try {
      // Permanently delete files
      if (fileIds.length > 0) {
        const validFileIds = fileIds.filter(id => isValidObjectId(id));
        
        if (validFileIds.length > 0) {
          // Get file paths for unlinking from filesystem
          const filesToDelete = await PersonalFile.find(
            { _id: { $in: validFileIds }, userId },
            'filePath'
          ).session(session);
          
          // Permanently delete from database
          await PersonalFile.deleteMany(
            { _id: { $in: validFileIds }, userId },
            { session }
          );
          
          // Also delete actual files from filesystem if paths exist
          for (const file of filesToDelete) {
            if (file.filePath && fs.existsSync(file.filePath)) {
              fs.unlinkSync(file.filePath);
            }
          }
        }
      }

      // Delete folders
      if (folderIds.length > 0) {
        const validFolderIds = folderIds.filter(id => isValidObjectId(id));
        
        if (validFolderIds.length > 0) {
          // For each folder, permanently delete all contents recursively
          for (const folderId of validFolderIds) {
            await permanentlyDeleteFolderContents(folderId, userId, session);
          }
          
          // Then delete the folders themselves
          await PersonalFolder.deleteMany(
            { _id: { $in: validFolderIds }, userId },
            { session }
          );
        }
      }

      await session.commitTransaction();
      
      return res.status(200).json({ success: true, message: 'Items permanently deleted successfully' });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteItems:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  } finally {
    session.endSession();
  }
};

// Helper function to recursively permanently delete folder contents
async function permanentlyDeleteFolderContents(folderId, userId, session) {
  // Find all subfolders
  const subfolders = await PersonalFolder.find({
    parentFolder: folderId,
    userId
  }, null, { session });

  // Recursively process each subfolder
  for (const subfolder of subfolders) {
    await permanentlyDeleteFolderContents(subfolder._id, userId, session);
  }

  // Delete all subfolders
  if (subfolders.length > 0) {
    await PersonalFolder.deleteMany(
      { _id: { $in: subfolders.map(folder => folder._id) } },
      { session }
    );
  }

  // Find all files in the folder to get their paths
  const filesToDelete = await PersonalFile.find(
    { parentFolder: folderId, userId },
    'filePath'
  ).session(session);
  
  // Delete files from filesystem if paths exist
  for (const file of filesToDelete) {
    if (file.filePath && fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }
  }
  
  // Permanently delete all files in the folder from database
  await PersonalFile.deleteMany(
    { parentFolder: folderId, userId },
    { session }
  );
}

// Rename a file or folder
export const renameItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { name, isFolder } = req.body;
    const userId = req.user.id;

    if (!itemId || !name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Item ID and new name are required' });
    }

    if (!isValidObjectId(itemId)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID' });
    }

    if (isFolder) {
      const folder = await PersonalFolder.findOne({
        _id: itemId,
        userId
      });

      if (!folder) {
        return res.status(404).json({ success: false, message: 'Folder not found' });
      }

      // Check if a folder with the new name already exists in the same parent folder
      const existingFolder = await PersonalFolder.findOne({
        name: name.trim(),
        userId,
        parentFolder: folder.parentFolder,
        _id: { $ne: itemId }
      });

      if (existingFolder) {
        return res.status(400).json({ success: false, message: 'A folder with this name already exists in this location' });
      }

      folder.name = name.trim();
      await folder.save();
      return res.status(200).json({ success: true, folder });
    } else {
      const file = await PersonalFile.findOne({
        _id: itemId,
        userId
      });

      if (!file) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      // Check if a file with the new name already exists in the same folder
      const existingFile = await PersonalFile.findOne({
        name: name.trim(),
        userId,
        parentFolder: file.parentFolder,
        _id: { $ne: itemId }
      });

      if (existingFile) {
        return res.status(400).json({ success: false, message: 'A file with this name already exists in this location' });
      }

      file.name = name.trim();
      await file.save();
      return res.status(200).json({ success: true, file });
    }
  } catch (error) {
    console.error('Error in renameItem:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Move items to a different folder
export const moveItems = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { fileIds = [], folderIds = [], destinationFolderId } = req.body;
    const userId = req.user.id;

    if (fileIds.length === 0 && folderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No items to move' });
    }

    // Validate destination folder
    let targetFolder = destinationFolderId === 'root' ? null : destinationFolderId;
    
    if (targetFolder && !isValidObjectId(targetFolder)) {
      return res.status(400).json({ success: false, message: 'Invalid destination folder ID' });
    }

    if (targetFolder) {
      const targetFolderExists = await PersonalFolder.findOne({
        _id: targetFolder,
        userId
      });
      
      if (!targetFolderExists) {
        return res.status(404).json({ success: false, message: 'Destination folder not found' });
      }
    }

    try {
      // Move folders
      if (folderIds.length > 0) {
        const validFolderIds = folderIds.filter(id => isValidObjectId(id));
        
        if (validFolderIds.length > 0) {
          // Check that we're not moving a folder into itself or one of its descendants
          for (const folderId of validFolderIds) {
            if (folderId === targetFolder) {
              throw new Error('Cannot move a folder into itself');
            }

            if (targetFolder) {
              // Get the folder we're trying to move
              const folder = await PersonalFolder.findById(folderId);
              if (!folder) continue;
              
              // Check if target is a child of this folder (can't move parent into child)
              const isParent = await isParentFolder(folderId, targetFolder, userId);
              if (isParent) {
                throw new Error('Cannot move a folder into one of its descendants');
              }
            }
          }

          // Check for duplicate folder names in the target
          for (const folderId of validFolderIds) {
            const folder = await PersonalFolder.findOne({
              _id: folderId,
              userId,
              isDeleted: false
            });
            
            if (!folder) continue;

            const existingFolder = await PersonalFolder.findOne({
              name: folder.name,
              userId,
              parentFolder: targetFolder,
              isDeleted: false,
              _id: { $ne: folderId }
            });

            if (existingFolder) {
              throw new Error(`A folder named "${folder.name}" already exists in the target location`);
            }
          }

          // Move the folders
          await PersonalFolder.updateMany(
            { _id: { $in: validFolderIds }, userId, isDeleted: false },
            { parentFolder: targetFolder },
            { session }
          );
        }
      }

      // Move files
      if (fileIds.length > 0) {
        const validFileIds = fileIds.filter(id => isValidObjectId(id));
        
        if (validFileIds.length > 0) {
          // Check for duplicate file names in the target
          for (const fileId of validFileIds) {
            const file = await PersonalFile.findOne({
              _id: fileId,
              userId,
              isDeleted: false
            });
            
            if (!file) continue;

            const existingFile = await PersonalFile.findOne({
              name: file.name,
              userId,
              parentFolder: targetFolder,
              isDeleted: false,
              _id: { $ne: fileId }
            });

            if (existingFile) {
              throw new Error(`A file named "${file.name}" already exists in the target location`);
            }
          }

          // Move the files
          await PersonalFile.updateMany(
            { _id: { $in: validFileIds }, userId, isDeleted: false },
            { parentFolder: targetFolder },
            { session }
          );
        }
      }

      await session.commitTransaction();
      
      return res.status(200).json({ success: true, message: 'Items moved successfully' });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    }
  } catch (error) {
    console.error('Error in moveItems:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  } finally {
    session.endSession();
  }
};

/**
 * Helper function to check if a folder is a parent of another folder
 */
async function isParentFolder(potentialParentId, childId, userId) {
  let currentFolder = await PersonalFolder.findOne({ _id: childId, userId });
  
  if (!currentFolder || !currentFolder.parentFolder) {
    return false;
  }
  
  if (currentFolder.parentFolder.toString() === potentialParentId.toString()) {
    return true;
  }
  
  return isParentFolder(potentialParentId, currentFolder.parentFolder, userId);
} 