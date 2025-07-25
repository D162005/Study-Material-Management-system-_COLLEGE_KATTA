import { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';

const API_URL = 'http://localhost:5002/api';

const FileContext = createContext();

export const useFileContext = () => {
  return useContext(FileContext);
};

export const FileProvider = ({ children }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [recentFiles, setRecentFiles] = useState([]);
  const [myUploads, setMyUploads] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [bookmarkedFiles, setBookmarkedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Set up axios interceptor for authentication
  useEffect(() => {
    // Remove any previous interceptors to avoid duplicates
    const interceptorId = axios.interceptors.request.use(
      (config) => {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
          console.log('Setting auth header with token');
        } else {
          console.log('No token found in localStorage');
        }
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );
    
    // Cleanup function to eject the interceptor when the component unmounts
    return () => {
      axios.interceptors.request.eject(interceptorId);
    };
  }, []);
  
  // Load data when user changes
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Fetch recent files (approved files)
        const recentResponse = await axios.get(`${API_URL}/files?status=approved`);
        setRecentFiles(recentResponse.data.files || []);
        
        // Fetch user-specific data if authenticated
        if (isAuthenticated && currentUser) {
          try {
            // Fetch user's uploads
            const uploadsResponse = await axios.get(`${API_URL}/files/my-uploads`);
            setMyUploads(uploadsResponse.data.files || []);
          } catch (error) {
            console.error('Error fetching user uploads:', error);
          }
          
          try {
            // Fetch user's bookmarks
            const bookmarksResponse = await axios.get(`${API_URL}/files/bookmarks`);
            setBookmarkedFiles(bookmarksResponse.data.files || []);
          } catch (error) {
            console.error('Error fetching bookmarks:', error);
          }
          
          // Load personal files and add them to myUploads
          try {
            const personalFilesResponse = await axios.get(`${API_URL}/personal-files/list`);
            if (personalFilesResponse.data && personalFilesResponse.data.success) {
              // Get files from the response
              const personalFiles = personalFilesResponse.data.items?.files || [];
              console.log('Loading personal files:', personalFiles.length);
              
              // Add each personal file to myUploads state
              const formattedPersonalFiles = personalFiles.map(file => ({
                _id: file._id,
                title: file.title || file.name,
                description: file.description || '',
                subject: file.subject || 'Personal Study Material',
                type: file.materialType || 'Notes',
                fileType: file.name.split('.').pop() || 'pdf',
                fileSize: file.size || 0,
                fileName: file.name,
                createdAt: file.createdAt,
                status: 'personal_file',
                isPersonalFile: true
              }));
              
              // Log for debugging
              console.log('Formatted personal files:', formattedPersonalFiles.map(f => ({ 
                id: f._id, 
                title: f.title, 
                subject: f.subject 
              })));
              
              // Add to existing myUploads (if any exist)
              setMyUploads(prevUploads => [...formattedPersonalFiles, ...prevUploads]);
            }
          } catch (error) {
            console.error('Error fetching personal files:', error);
          }
          
          // If user is admin, fetch pending files
          if (currentUser.isAdmin) {
            try {
              const pendingResponse = await axios.get(`${API_URL}/files?status=pending`);
              setPendingFiles(pendingResponse.data.files || []);
            } catch (error) {
              console.error('Error fetching pending files:', error);
            }
          }
        }
      } catch (err) {
        console.error('Error loading files:', err);
        setError('Failed to load files');
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, [currentUser, isAuthenticated]);
  
  // Add a new file to the system - this will be stored as pending until approved by admin
  const addFile = async (fileData) => {
    if (!fileData || !fileData.title) {
      console.error('Missing required file data');
      setError('Missing file information. Please provide at least a title.');
      return null;
    }
    
    console.log('Uploading file:', fileData.title);
    setLoading(true);
    
    try {
      // Make sure we have the token in the header
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No auth token found, user must be logged in to upload files');
        setError('You must be logged in to upload files');
        setLoading(false);
        return null;
      }
      
      // Set the authorization header explicitly
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Convert fileSize to a number if it's a formatted string
      let fileSizeValue = fileData.fileSize;
      if (typeof fileData.fileSize === 'string') {
        // Store the original file size in bytes if available
        if (fileData.file && fileData.file.size) {
          fileSizeValue = fileData.file.size;
        } else {
          // Try to extract the number from the formatted string
          const sizeMatch = fileData.fileSize.match(/^([\d.]+)\s*(bytes|KB|MB|GB)?$/i);
          if (sizeMatch) {
            const value = parseFloat(sizeMatch[1]);
            const unit = sizeMatch[2]?.toLowerCase();
            
            if (unit === 'kb') {
              fileSizeValue = Math.round(value * 1024);
            } else if (unit === 'mb') {
              fileSizeValue = Math.round(value * 1024 * 1024);
            } else if (unit === 'gb') {
              fileSizeValue = Math.round(value * 1024 * 1024 * 1024);
            } else {
              fileSizeValue = value; // bytes
            }
          } else {
            fileSizeValue = 0; // fallback
          }
        }
      }
      
      console.log('File size processed:', fileData.fileSize, '→', fileSizeValue, 'bytes');
      
      // Create file data for upload
      const formData = {
      title: fileData.title,
      description: fileData.description || '',
      branch: fileData.branch || '',
      year: fileData.year || '',
      subject: fileData.subject || '',
        type: fileData.type || 'Notes', // Ensure this matches one of the predefined types: Notes, Question Paper (PYQ), Lab Manual, Project
      fileType: fileData.fileType || 'pdf',
        fileSize: fileSizeValue, // Now a number in bytes
      fileName: fileData.fileName || 'document.pdf',
        fileContent: fileData.fileData // Base64 encoded file content
      };
      
      // Validate material type to ensure it matches one of the approved types
      const validTypes = ['Notes', 'Question Paper (PYQ)', 'Lab Manual', 'Project'];
      if (!validTypes.includes(formData.type)) {
        console.warn(`Invalid file type: ${formData.type}. Defaulting to Notes.`);
        formData.type = 'Notes';
      }
      
      console.log('Sending file upload request to:', `${API_URL}/files`);
      console.log('File details:', { 
        title: formData.title, 
        type: formData.type,
        fileType: formData.fileType,
        size: formData.fileSize
      });
      
      const response = await axios.post(`${API_URL}/files`, formData);
      
      if (!response.data || !response.data.file) {
        throw new Error('Invalid response from server');
      }
      
      const newFile = response.data.file;
      console.log('File uploaded successfully, ID:', newFile._id);
    
      // Add to pending files if admin
      if (currentUser?.isAdmin) {
        setPendingFiles(prevFiles => [newFile, ...prevFiles]);
      }
      
      // Add to user's uploads
      setMyUploads(prevUploads => [newFile, ...prevUploads]);
      
      setLoading(false);
      return newFile;
    } catch (err) {
      console.error('Error adding file:', err);
      if (err.response) {
        // Log detailed error information
        console.error('Server response:', err.response.status, err.response.data);
        setError(err.response.data.message || 'Failed to upload file. Server returned an error.');
      } else if (err.request) {
        // The request was made but no response was received
        console.error('No response received');
        setError('Network error: Could not connect to the server');
      } else {
        // Something happened in setting up the request
        setError(err.message || 'Failed to upload file. Please try again.');
      }
      setLoading(false);
      return null;
    }
  };
  
  // Approve a pending file (admin only)
  const approveFile = async (fileId) => {
    try {
      setLoading(true);
      console.log('Sending approval request for file:', fileId);
      
      // Make sure we have the token in the header
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No auth token found, user must be logged in to approve files');
        setError('You must be logged in to approve files');
        setLoading(false);
        return false;
      }
      
      // Set the authorization header explicitly
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const response = await axios.patch(`${API_URL}/files/${fileId}/status`, {
        status: 'approved'
      });
      
      if (!response.data || !response.data.file) {
        throw new Error('Invalid response from server');
      }
      
      const approvedFile = response.data.file;
      console.log('File approval successful:', approvedFile._id);
      
      // Update pending files list - remove the approved file
      setPendingFiles(prevFiles => prevFiles.filter(file => file._id !== fileId));
      
      // Add to recent files list - add to beginning
      setRecentFiles(prevFiles => {
        // Check if the file already exists in the list to avoid duplicates
        const fileExists = prevFiles.some(file => file._id === fileId);
        if (fileExists) {
          return prevFiles.map(file => 
            file._id === fileId ? { ...file, status: 'approved' } : file
          );
        }
        return [approvedFile, ...prevFiles];
      });
      
      // Update in user's uploads if it belongs to them
        setMyUploads(prevUploads => 
          prevUploads.map(file => 
          file._id === fileId ? { ...file, status: 'approved' } : file
        )
      );
      
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error approving file:', err);
      if (err.response) {
        console.error('Server response:', err.response.status, err.response.data);
        setError(err.response.data.message || 'Failed to approve file');
      } else if (err.request) {
        console.error('No response received');
        setError('Network error: Could not connect to the server');
      } else {
        setError(err.message || 'Failed to approve file');
      }
      setLoading(false);
      return false;
    }
  };
  
  // Reject a pending file (admin only)
  const rejectFile = async (fileId) => {
    try {
      setLoading(true);
      console.log('Sending rejection request for file:', fileId);
      
      // Make sure we have the token in the header
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No auth token found, user must be logged in to reject files');
        setError('You must be logged in to reject files');
        setLoading(false);
        return false;
      }
      
      // Set the authorization header explicitly
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const response = await axios.patch(`${API_URL}/files/${fileId}/status`, {
        status: 'rejected'
      });
      
      if (!response.data || !response.data.file) {
        throw new Error('Invalid response from server');
      }
      
      const rejectedFile = response.data.file;
      console.log('File rejection successful:', rejectedFile._id);
      
      // Update pending files - remove the rejected file
      setPendingFiles(prevFiles => prevFiles.filter(file => file._id !== fileId));
      
      // Update in user's uploads if it belongs to them
        setMyUploads(prevUploads => 
          prevUploads.map(file => 
          file._id === fileId ? { ...file, status: 'rejected' } : file
        )
      );
      
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error rejecting file:', err);
      if (err.response) {
        console.error('Server response:', err.response.status, err.response.data);
        setError(err.response.data.message || 'Failed to reject file');
      } else if (err.request) {
        console.error('No response received');
        setError('Network error: Could not connect to the server');
      } else {
        setError(err.message || 'Failed to reject file');
      }
      setLoading(false);
      return false;
    }
  };
  
  // Remove file completely
  const removeFile = async (fileId) => {
    try {
      await axios.delete(`${API_URL}/files/${fileId}`);
      
      // Remove from recent files
      setRecentFiles(prevFiles => prevFiles.filter(file => file._id !== fileId));
      
      // Remove from pending files
      setPendingFiles(prevFiles => prevFiles.filter(file => file._id !== fileId));
      
      // Remove from user's uploads
      setMyUploads(prevUploads => prevUploads.filter(file => file._id !== fileId));
      
      // Remove from bookmarks
      setBookmarkedFiles(prevBookmarks => prevBookmarks.filter(file => file._id !== fileId));
      
      return true;
    } catch (err) {
      console.error('Error removing file:', err);
      setError(err.response?.data?.message || 'Failed to remove file');
      return false;
    }
  };
  
  // Remove file from user's uploads only (keeps it in study materials)
  const removeUserFile = async (fileId) => {
    if (!fileId || !currentUser) return false;
    
    try {
      // First check if the file is pending
      const file = myUploads.find(f => f._id === fileId);
      
      if (file.status === 'pending') {
        // If pending, completely remove the file
        return await removeFile(fileId);
      } else {
        // If already approved, just remove from user's uploads locally
        // In a real API, we'd have an endpoint for this specific operation
      setMyUploads(prevUploads => prevUploads.filter(file => file._id !== fileId));
        return true;
      }
    } catch (err) {
      console.error('Error removing user file:', err);
      return false;
    }
  };
  
  // Toggle bookmark for a file
  const toggleBookmark = async (fileId) => {
    // Validate fileId and user login status with detailed logging
    if (!fileId) {
      console.error('Cannot bookmark: File ID is undefined or null');
      setError('Invalid file ID for bookmark');
      return false;
    }
    
    if (!currentUser) {
      console.error('Cannot bookmark: User not logged in');
      setError('You must be logged in to bookmark files');
      return false;
    }
    
    try {
      console.log('Toggling bookmark for file ID:', fileId);
      
      // Optimistic update
      const file = recentFiles.find(f => f._id === fileId);
      
      if (!file) {
        console.error('File not found in recent files');
        return false;
      }
      
      // Check if already bookmarked
      const isCurrentlyBookmarked = bookmarkedFiles.some(f => f._id === fileId);
      
      // Optimistically update UI
      if (isCurrentlyBookmarked) {
        // Remove from bookmarks
        setBookmarkedFiles(prev => prev.filter(f => f._id !== fileId));
    } else {
      // Add to bookmarks
        setBookmarkedFiles(prev => [file, ...prev]);
      }
      
      // Call API
      const response = await axios.post(`${API_URL}/files/${fileId}/bookmark`);
      
      // If API call returns different result than expected, revert changes
      if (response.data.isBookmarked !== !isCurrentlyBookmarked) {
        console.log('Bookmark state mismatch, reverting UI');
        // Reload bookmarks to ensure consistency
        const bookmarksResponse = await axios.get(`${API_URL}/files/bookmarks`);
        setBookmarkedFiles(bookmarksResponse.data.files);
      }
      
      return true;
    } catch (err) {
      console.error('Error toggling bookmark:', err);
      
      // Revert optimistic update on error
      const bookmarksResponse = await axios.get(`${API_URL}/files/bookmarks`);
      setBookmarkedFiles(bookmarksResponse.data.files);
      
      setError(err.response?.data?.message || 'Failed to toggle bookmark');
      return false;
    }
  };
  
  // Check if a file is bookmarked by the current user
  const isFileBookmarked = (fileId) => {
    if (!fileId) {
      console.log('isFileBookmarked: No file ID provided');
      return false;
    }
    
    if (!bookmarkedFiles || !bookmarkedFiles.length) {
      return false;
    }
    
    // Check for both _id and id formats to be safe
    return bookmarkedFiles.some(file => 
      (file._id && file._id === fileId) || 
      (file.id && file.id === fileId)
    );
  };
  
  // Download a file
  const downloadFile = async (fileId) => {
    try {
      // Check if user is authenticated
      if (!isAuthenticated) {
        setError('Please log in to download files');
        // Redirect to login page
        window.location.href = '/login?redirect=study-materials';
        return false;
      }
      
      // Validate fileId to prevent undefined values
      if (!fileId) {
        console.error('Cannot download: File ID is undefined or null');
        setError('Invalid file ID for download');
        return false;
      }

      setLoading(true);
      console.log('Initiating download for file:', fileId);
      
      // Make sure we have the token in the header (in case of protected files)
      const token = localStorage.getItem('token');
      if (token) {
        // Set the authorization header explicitly
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await axios.get(`${API_URL}/files/${fileId}/download`);
      
      if (!response.data || !response.data.fileContent) {
        throw new Error('No file content returned from server');
      }
      
      // Extract file info from response
      const { fileContent, fileName, fileType } = response.data;
      console.log('File download response received, content length:', 
        fileContent ? fileContent.length : 'unknown');
      
      try {
        // Create a blob from the file content
        const blob = base64ToBlob(fileContent, fileType);
        console.log('Created blob for download, size:', blob.size);
        
        // Create a download link and trigger it
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName || `download.${fileType || 'pdf'}`;
        document.body.appendChild(a);
        
        console.log('Triggering download for file:', fileName);
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log('Download complete');
        setLoading(false);
        return true;
      } catch (blobError) {
        console.error('Error creating blob from base64:', blobError);
        throw new Error('Failed to process the downloaded file');
      }
    } catch (err) {
      console.error('Error downloading file:', err);
      if (err.response) {
        console.error('Server response:', err.response.status, err.response.data);
        setError(err.response.data.message || 'Failed to download file');
      } else if (err.request) {
        console.error('No response received');
        setError('Network error: Could not connect to the server');
      } else {
        setError(err.message || 'Failed to download file');
      }
      setLoading(false);
      return false;
    }
  };
  
  // Helper function to convert base64 to blob
  const base64ToBlob = (base64, type) => {
    try {
      // Handle both formats: with data URI prefix and without
      let base64Data;
      if (base64.includes(',')) {
        base64Data = base64.split(',')[1];
      } else {
        base64Data = base64;
      }
      
      const byteCharacters = atob(base64Data);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      return new Blob(byteArrays, { type: `application/${type}` });
    } catch (error) {
      console.error('Error in base64ToBlob conversion:', error);
      throw error;
    }
  };
  
  // Search files with multiple filters
  const searchFiles = (query = '', filters = {}, sourceFiles = recentFiles) => {
    console.log('Searching files with query:', query, 'filters:', filters);
    
    if (!sourceFiles || !sourceFiles.length) {
      console.log('No source files available for search');
      return [];
    }
    
    let results = [...sourceFiles];
    
    // Apply text search
    if (query.trim() !== '') {
      const searchTerm = query.toLowerCase();
      console.log('Applying search term:', searchTerm);
      results = results.filter(file => 
        file.title?.toLowerCase().includes(searchTerm) ||
        file.description?.toLowerCase().includes(searchTerm) ||
        file.subject?.toLowerCase().includes(searchTerm) ||
        file.type?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply additional filters
    if (filters.branch) {
      console.log('Filtering by branch:', filters.branch);
      results = results.filter(file => file.branch === filters.branch);
    }
    
    if (filters.year) {
      console.log('Filtering by year:', filters.year);
      results = results.filter(file => file.year === filters.year);
    }
    
    if (filters.subject) {
      console.log('Filtering by subject:', filters.subject);
      results = results.filter(file => file.subject === filters.subject);
    }
    
    if (filters.type) {
      console.log('Filtering by type:', filters.type);
      results = results.filter(file => file.type === filters.type);
    }
    
    // Additional filters for specific file types
    if (filters.experimentType && filters.type === 'Lab Manual') {
      console.log('Filtering by experiment type:', filters.experimentType);
      results = results.filter(file => file.experimentType === filters.experimentType || file.materialType === filters.experimentType);
    }
    
    console.log('Search results:', results.length, 'files');
    return results;
  };
  
  // Add a personal file to myUploads state
  const addPersonalFile = async (personalFile) => {
    console.log('addPersonalFile called with:', personalFile);
    
    if (!personalFile || !personalFile._id) {
      console.error('Invalid personal file data:', personalFile);
      return null;
    }
    
    // Format the personal file to match the structure used in myUploads
    const formattedFile = {
      _id: personalFile._id,
      title: personalFile.title || personalFile.name,
      description: personalFile.description || '',
      subject: personalFile.subject || 'Personal Study Material',
      type: personalFile.materialType || 'Notes',
      fileType: personalFile.name.split('.').pop() || 'pdf',
      fileSize: personalFile.size || 0,
      fileName: personalFile.name,
      createdAt: personalFile.createdAt,
      status: 'personal_file', // Special status for personal files
      isPersonalFile: true // Flag to identify personal files
    };

    // Log the file subject to help with debugging
    console.log('Personal file subject:', personalFile.subject);
    console.log('Formatted subject:', formattedFile.subject);
    
    console.log('Adding personal file to myUploads:', formattedFile.title);
    console.log('Formatted file data:', formattedFile);
    
    // Add to user's uploads
    setMyUploads(prevUploads => {
      console.log('Previous uploads count:', prevUploads.length);
      // Check if file already exists to avoid duplicates
      const fileExists = prevUploads.some(file => file._id === formattedFile._id);
      if (fileExists) {
        console.log('File already exists in myUploads, skipping');
        return prevUploads;
      }
      console.log('Adding new file to myUploads');
      return [formattedFile, ...prevUploads];
    });
    
    return formattedFile;
  };
  
  const value = {
    recentFiles,
    myUploads,
    pendingFiles,
    bookmarkedFiles,
    loading,
    error,
    addFile,
    approveFile,
    rejectFile,
    removeFile,
    removeUserFile,
    toggleBookmark,
    isFileBookmarked,
    downloadFile,
    searchFiles,
    addPersonalFile
  };
  
  return (
    <FileContext.Provider value={value}>
      {children}
    </FileContext.Provider>
  );
};

export default FileContext; 