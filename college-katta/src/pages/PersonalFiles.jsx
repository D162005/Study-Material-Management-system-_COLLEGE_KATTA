import React, { useState, useEffect, useRef } from 'react';
import { FaFileUpload, FaCloudUploadAlt, FaFile, FaFolder, FaDownload, FaTrash, FaChevronRight, FaArrowLeft, FaSearch } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useFileContext } from '../context/FileContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("PersonalFiles error caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 p-4 rounded-md border border-red-200 my-4">
          <h3 className="text-red-800 font-semibold mb-2">Something went wrong</h3>
          <p className="text-red-600 mb-2">The personal files section encountered an error.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const PersonalFiles = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const { addPersonalFile } = useFileContext();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [tempFiles, setTempFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [folders, setFolders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef(null);
  const fetchRetries = useRef(0);
  const maxRetries = 3;
  
  // Use consistent API URL across the application
  const API_URL = 'http://localhost:5002/api';
  
  console.log('PersonalFiles component initialized');
  console.log('API URL:', API_URL);
  console.log('Is authenticated:', isAuthenticated);
  console.log('Current user:', currentUser ? 'Yes' : 'No');

  // Get token from localStorage - consistent method across all API calls
  const getToken = () => {
    return localStorage.getItem('token');
  };

  // Load files from MongoDB when component mounts
  useEffect(() => {
    console.log('PersonalFiles useEffect triggered');
    console.log('Authentication state:', isAuthenticated);
    console.log('Current user:', currentUser ? 'Yes' : 'No');
    
    if (isAuthenticated && currentUser) {
      console.log('Calling fetchFilesFromServer');
      fetchFilesFromServer();
    } else {
      console.log('Not authenticated or no current user, skipping fetch');
      setLoading(false);
    }
  }, [isAuthenticated, currentUser]);

  // Fetch files for a specific folder with retry logic
  const fetchFilesFromServer = async (folderId = null, retryCount = 0) => {
    setLoading(true);
    try {
      console.log('Fetching files from server...');
      
      // Get token from localStorage
      const token = getToken();
      
      if (!token) {
        throw new Error('Authentication token is missing');
      }
      
      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 10000 // 10 second timeout
      };
      
      // Make sure we're using the correct endpoint
      const endpoint = folderId 
        ? `${API_URL}/personal-files/list/${folderId}` 
        : `${API_URL}/personal-files/list`;
      
      console.log('Sending request to:', endpoint);
      
      const response = await axios.get(endpoint, config);
      
      console.log('API response:', response.data);
      
      if (response.data && response.data.success) {
        // Set current folder and data
        setCurrentFolder(response.data.currentFolder);
        
        // Filter out "My Files" from breadcrumbs
        const filteredBreadcrumbs = response.data.breadcrumbs 
          ? response.data.breadcrumbs.filter(crumb => crumb.id !== 'root')
          : [];
        
        setBreadcrumbs(filteredBreadcrumbs);
        setFolders(response.data.items?.folders || []);
        setUploadedFiles(response.data.items?.files || []);
        console.log('Data loaded successfully');
        fetchRetries.current = 0; // Reset retry counter on success
      } else {
        throw new Error(response.data?.message || 'Failed to load files');
      }
    } catch (error) {
      console.error("Error fetching files from server:", error);
      console.error("Full error object:", JSON.stringify({
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : 'No response',
        request: error.request ? 'Request exists' : 'No request'
      }));
      
      // Retry logic
      if (retryCount < maxRetries) {
        console.log(`Retrying fetch (${retryCount + 1}/${maxRetries})...`);
        setTimeout(() => {
          fetchFilesFromServer(folderId, retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
        return;
      }
      
      setUploadStatus({
        type: 'error',
        message: `Failed to load your files: ${error.response?.data?.message || error.message}. Please try refreshing the page.`
      });
      // Set empty arrays to avoid undefined errors
      setFolders([]);
      setUploadedFiles([]);
    } finally {
      setLoading(false);
    }
  };

  // Navigation - handle folder click
  const handleFolderClick = (folderId) => {
    fetchFilesFromServer(folderId);
  };

  // Navigation - handle breadcrumb click
  const handleBreadcrumbClick = (folderId) => {
    fetchFilesFromServer(folderId === 'root' ? null : folderId);
  };

  // Handle file selection - just store the files temporarily
  const handleFileSelect = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFiles = Array.from(event.target.files);
      
      // Validate file types and sizes
      const invalidFiles = selectedFiles.filter(file => {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'jpg', 'jpeg', 'png', 'gif', 'zip', 'rar'];
        
        // Check file type
        if (!allowedExtensions.includes(fileExtension)) {
          setUploadStatus({
            type: 'error',
            message: `File type .${fileExtension} is not allowed`
          });
          return true;
        }
        
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          setUploadStatus({
            type: 'error',
            message: `File ${file.name} exceeds the 10MB size limit`
          });
          return true;
        }
        
        return false;
      });
      
      if (invalidFiles.length === 0) {
        setTempFiles(selectedFiles);
        setUploadStatus(null);
      }
    }
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      
      // Validate file types and sizes
      const invalidFiles = droppedFiles.filter(file => {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'jpg', 'jpeg', 'png', 'gif', 'zip', 'rar'];
        
        // Check file type
        if (!allowedExtensions.includes(fileExtension)) {
          setUploadStatus({
            type: 'error',
            message: `File type .${fileExtension} is not allowed`
          });
          return true;
        }
        
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          setUploadStatus({
            type: 'error',
            message: `File ${file.name} exceeds the 10MB size limit`
          });
          return true;
        }
        
        return false;
      });
      
      if (invalidFiles.length === 0) {
        setTempFiles(droppedFiles);
        setUploadStatus(null);
      }
    }
  };

  // Handle form submission
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form inputs
    if (!tempFiles || tempFiles.length === 0) {
      setUploadStatus({
        type: 'error',
        message: 'Please select files to upload'
      });
      return;
    }
    
    const title = e.target.title.value.trim();
    const subject = e.target.subject.value.trim();
    const description = e.target.description.value.trim();
    const materialType = e.target.materialType.value;
    
    console.log('Form values:', { title, subject, description, materialType });
    console.log('Files to upload:', tempFiles);
    
    if (!title) {
      setUploadStatus({
        type: 'error',
        message: 'Please enter a title for your study material'
      });
      return;
    }
    
    if (!subject) {
      setUploadStatus({
        type: 'error',
        message: 'Please enter a subject for your study material'
      });
      return;
    }
    
    setUploadProgress(0);
    setUploadStatus({
      type: 'info',
      message: 'Uploading files to server...'
    });
    
    try {
      // Create FormData to send files
      const formData = new FormData();
      formData.append('title', title);
      formData.append('subject', subject);
      formData.append('description', description);
      formData.append('materialType', materialType);
      
      // Append all selected files
      tempFiles.forEach((file, index) => {
        console.log(`Appending file ${index + 1}/${tempFiles.length}: ${file.name}`);
        formData.append('files', file);
      });
      
      // Debug: Log FormData entries
      for (let [key, value] of formData.entries()) {
        console.log(`FormData entry - ${key}: ${value instanceof File ? value.name : value}`);
      }
      
      // Ensure correct API endpoint
      const folderId = currentFolder || 'root';
      const uploadEndpoint = `${API_URL}/personal-files/upload/${folderId}`;
      
      console.log('Using upload endpoint:', uploadEndpoint);
      
      // Get token
      const token = getToken();
      
      if (!token) {
        throw new Error('Authentication token is missing');
      }
      
      console.log('Starting upload request...');
      
      // Upload to server with progress tracking
      const response = await axios.post(uploadEndpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Upload progress: ${percentCompleted}%`);
          setUploadProgress(percentCompleted);
        },
        timeout: 60000 // 60 second timeout for multiple file uploads
      });
      
      console.log('Upload response:', response.data);
      
      // Update state with new files from server response
      if (response.data.success) {
        // Add the personal files to myUploads in FileContext
        if (response.data.files && response.data.files.length > 0) {
          console.log(`Successfully uploaded ${response.data.files.length} files:`, response.data.files);
          // If multiple files were uploaded, add them all
          for (const file of response.data.files) {
            await addPersonalFile(file);
          }
        } else if (response.data.file) {
          // Handle legacy response format (single file)
          console.log('Successfully uploaded file:', response.data.file);
          await addPersonalFile(response.data.file);
        } else {
          console.warn('No files returned in the successful response');
        }
        
        // Refresh files from server to ensure we have the latest data
        fetchFilesFromServer(currentFolder);
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
      
      // Reset upload state
      setUploadProgress(100);
      setUploadStatus({
        type: 'success',
        message: response.data.message || `Successfully uploaded ${tempFiles.length} file(s)`
      });
      
      // Reset the file input and close modal
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setTempFiles([]);
      setIsUploading(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadStatus(null);
      }, 3000);
    } catch (error) {
      console.error("Upload failed:", error);
      // Enhanced error debugging
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        console.error("Error response headers:", error.response.headers);
      } else if (error.request) {
        console.error("Error request:", error.request);
      }
      
      setUploadProgress(0);
      setUploadStatus({
        type: 'error',
        message: `Upload failed: ${error.response?.data?.message || error.message || 'Unknown error'}`
      });
    }
  };

  // Handle file download
  const handleDownload = async (fileId, fileName) => {
    try {
      setUploadStatus({
        type: 'info',
        message: `Downloading ${fileName}...`
      });
      
      // Get token
      const token = getToken();
      
      if (!token) {
        throw new Error('Authentication token is missing');
      }
      
      const downloadEndpoint = `${API_URL}/personal-files/download/${fileId}`;
      console.log('Download request to:', downloadEndpoint);
      
      const response = await axios.get(downloadEndpoint, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob', // Important for file downloads
        timeout: 30000 // 30 second timeout for downloads
      });
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      
      // Create a temporary link element to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setUploadStatus({
        type: 'success',
        message: `Successfully downloaded ${fileName}`
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadStatus(null);
      }, 3000);
    } catch (error) {
      console.error("Error downloading file:", error);
      setUploadStatus({
        type: 'error',
        message: `Failed to download file: ${error.response?.data?.message || error.message || 'Unknown error'}`
      });
    }
  };

  // Handle file and folder deletion
  const handleDelete = async (items) => {
    // Show confirmation dialog
    const itemType = items.length > 1 
      ? 'items' 
      : items[0].isFolder 
        ? 'folder' 
        : 'file';
    
    const confirmMessage = `Are you sure you want to delete this ${itemType}? This will permanently remove it from your personal files storage and cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return; // User cancelled the deletion
    }
    
    try {
      setUploadStatus({
        type: 'info',
        message: 'Deleting selected items...'
      });
      
      // Get token
      const token = getToken();
      
      if (!token) {
        throw new Error('Authentication token is missing');
      }
      
      const deleteEndpoint = `${API_URL}/personal-files/delete`;
      console.log('Delete request to:', deleteEndpoint);
      
      await axios.delete(deleteEndpoint, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        data: {
          fileIds: items.filter(item => !item.isFolder).map(item => item._id),
          folderIds: items.filter(item => item.isFolder).map(item => item._id)
        },
        timeout: 10000 // 10 second timeout
      });
      
      // Refresh data from server
      fetchFilesFromServer(currentFolder);
      
      setUploadStatus({
        type: 'success',
        message: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} deleted successfully`
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadStatus(null);
      }, 3000);
    } catch (error) {
      console.error("Error deleting items:", error);
      setUploadStatus({
        type: 'error',
        message: `Failed to delete ${itemType}: ${error.response?.data?.message || error.message || 'Unknown error'}`
      });
    }
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Check if user is authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=personal-files');
    }
  }, [isAuthenticated, navigate]);

  // Filter function for search
  const filteredFolders = folders.filter(folder => 
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredFiles = uploadedFiles.filter(file => 
    (file.title && file.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <p className="text-gray-600">Please log in to access your personal study materials.</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Personal Study Materials</h1>
            <p className="text-gray-600 mt-1">Organize and access your personal study resources</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsUploading(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <FaFileUpload className="mr-2" />
              Upload Personal Material
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {uploadStatus && (
          <div className={`mb-4 p-3 rounded ${
            uploadStatus.type === 'success' ? 'bg-green-100 text-green-700' : 
            uploadStatus.type === 'error' ? 'bg-red-100 text-red-700' : 
            'bg-blue-100 text-blue-700'
          }`}>
            {uploadStatus.message}
            <button 
              className="float-right text-gray-600 hover:text-gray-800" 
              onClick={() => setUploadStatus(null)}
            >
              ×
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-3 flex justify-center">
          <div className="bg-white rounded-md shadow-sm border border-gray-200 flex items-center p-2 w-full max-w-xl">
            <FaSearch className="text-blue-500 mx-2 text-sm" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search your files and folders..."
              className="flex-1 py-1 outline-none text-gray-800 text-sm bg-white"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="text-gray-500 hover:text-gray-700 px-2 py-0.5 bg-gray-100 rounded mx-1 text-sm"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center bg-gray-100 px-3 py-2 rounded mb-4 overflow-x-auto">
            <button
              onClick={() => handleBreadcrumbClick('root')}
              className="text-sm text-gray-600 hover:text-blue-600"
            >
              Home
            </button>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.id || index}>
                <FaChevronRight className="mx-2 text-gray-400 text-xs" />
                <button
                  onClick={() => handleBreadcrumbClick(crumb.id)}
                  className={`text-sm ${
                    index === breadcrumbs.length - 1
                      ? 'font-semibold text-blue-600'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Loading your study materials...</span>
            </div>
          </div>
        ) : (
          <div>
            {/* Folders Section */}
            {(searchQuery ? filteredFolders : folders).length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-3">Folders</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(searchQuery ? filteredFolders : folders).map((folder) => (
                    <div 
                      key={folder._id} 
                      className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:bg-blue-50 transition-colors duration-200"
                      onClick={() => handleFolderClick(folder._id)}
                    >
                      <div className="flex items-center">
                        <div className="p-2 bg-amber-100 rounded-lg mr-3">
                          <FaFolder className="text-amber-500" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{folder.name}</h3>
                          <p className="text-xs text-gray-500">{formatDate(folder.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Files Section */}
            {(searchQuery ? filteredFiles : uploadedFiles).length > 0 ? (
              <div>
                <h2 className="text-lg font-semibold text-gray-700 mb-3">Files</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(searchQuery ? filteredFiles : uploadedFiles).map((file) => (
                    <div key={file._id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
                      <div className="p-4 flex-grow">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg mr-3">
                              <FaFile className="text-blue-500" />
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">{file.title || file.name}</h3>
                              <p className="text-sm text-blue-600">{file.materialType || 'Study Material'}</p>
                              {file.subject && <p className="text-xs text-gray-600">Subject: {file.subject}</p>}
                            </div>
                          </div>
                        </div>
                        
                        {file.description && (
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{file.description}</p>
                        )}
                        
                        <div className="mt-3 flex items-center text-xs text-gray-500">
                          <span className="mr-2 px-2 py-1 bg-gray-100 rounded-full">{formatFileSize(file.size)}</span>
                          <span>{formatDate(file.createdAt)}</span>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
                        <span className="text-xs text-gray-500 truncate" title={file.name}>{file.name}</span>
                        <div className="flex space-x-2">
                          <button 
                            className="p-1 text-green-600 hover:text-green-900"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(file._id, file.name);
                            }}
                            title="Download file"
                          >
                            <FaDownload />
                          </button>
                          <button 
                            className="p-1 text-red-600 hover:text-red-900"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete([file]);
                            }}
                            title="Delete file"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Empty state - no files in current folder or no search results
              <div className="bg-white rounded-lg shadow-md p-8">
                <div className="py-16 text-center">
                  {searchQuery ? (
                    <>
                      <FaSearch className="text-blue-400 text-6xl mx-auto mb-6" />
                      <h2 className="text-xl font-medium text-gray-800 mb-2">
                        File not found
                      </h2>
                    </>
                  ) : (
                    <>
                      <FaCloudUploadAlt className="text-blue-400 text-6xl mx-auto mb-6" />
                      <h2 className="text-xl font-medium text-gray-800 mb-2">
                        {folders.length > 0
                          ? "No files in this folder"
                          : "Your Personal Study Space"}
                      </h2>
                      <p className="text-gray-500 mb-6">
                        {currentFolder
                          ? "This folder is empty. Upload files to organize your study materials."
                          : "Upload and organize your private study materials here. All files are only visible to you."}
                      </p>
                      <div className="flex justify-center space-x-4">
                        {currentFolder && (
                          <button
                            onClick={() => handleBreadcrumbClick(breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].id : 'root')}
                            className="inline-flex items-center px-6 py-3 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                          >
                            <FaArrowLeft className="mr-2" /> Back
                          </button>
                        )}
                        <button
                          onClick={() => setIsUploading(true)}
                          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          <FaFileUpload className="mr-2" /> Upload Personal Material
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload Modal */}
        {isUploading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold">Upload Personal Study Material</h2>
                <button
                  type="button"
                  onClick={() => {
                    setIsUploading(false);
                    setUploadProgress(0);
                    setTempFiles([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="px-6 py-4">
                {/* Upload Progress Bar (visible during upload) */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mb-5 bg-blue-50 p-3 rounded-md">
                    <p className="text-sm text-blue-700 mb-2">Uploading your study materials to server...</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 text-right">{uploadProgress}% complete</p>
                  </div>
                )}

                <form onSubmit={handleUploadSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      id="title" 
                      name="title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm bg-white text-gray-900"
                      placeholder="Enter a title for your study material"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      id="subject" 
                      name="subject"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm bg-white text-gray-900"
                      placeholder="Enter the subject (e.g. Mathematics, Computer Science)"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea 
                      id="description" 
                      name="description"
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm bg-white text-gray-900"
                      placeholder="Add a description of this study material"
                    ></textarea>
                  </div>
                  
                  <div>
                    <label htmlFor="materialType" className="block text-sm font-medium text-gray-700 mb-1">
                      Type of Study Material
                    </label>
                    <select 
                      id="materialType" 
                      name="materialType"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm bg-white text-gray-900"
                    >
                      <option value="NOTES">Notes</option>
                      <option value="ASSIGNMENT">Assignment</option>
                      <option value="QUESTION_PAPER">Question Paper (PYQ)</option>
                      <option value="PROJECTS">Projects</option>
                      <option value="LAB_MANUAL">Lab Manual</option>
                    </select>
                  </div>

                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={handleDrop}
                  >
                    <FaCloudUploadAlt className="mx-auto text-gray-400 text-5xl mb-3" />
                    <p className="text-gray-700 font-medium mb-2">
                      {tempFiles.length > 0 
                        ? `${tempFiles.length} file(s) selected` 
                        : ''}
                    </p>
                    <input
                      type="file"
                      name="files"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      multiple
                      className="hidden"
                    />
                    <button 
                      type="button"
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow-sm transition-colors duration-200"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Browse Files
                    </button>
                    <p className="text-xs text-gray-500 mt-2">Maximum file size: 10MB</p>
                    
                    {tempFiles.length > 0 && (
                      <div className="mt-4 text-left bg-white p-3 rounded border border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-1">Selected files:</p>
                        <ul className="text-xs text-gray-600 max-h-24 overflow-y-auto space-y-1">
                          {tempFiles.map((file, index) => (
                            <li key={index} className="truncate">
                              <span className="inline-block w-4 h-4 mr-1 bg-blue-100 rounded-sm text-blue-600 flex items-center justify-center text-xs">
                                <FaFile size={10} />
                              </span>
                              {file.name} ({formatFileSize(file.size)})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3 pt-2 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUploading(false);
                        setUploadProgress(0);
                        setTempFiles([]);
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={uploadProgress > 0 && uploadProgress < 100 || tempFiles.length === 0}
                    >
                      Upload Personal Material
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default PersonalFiles; 