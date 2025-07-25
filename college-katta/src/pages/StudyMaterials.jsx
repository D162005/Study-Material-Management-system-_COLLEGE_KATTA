import React, { useState, useEffect } from 'react';
import { FaFilter, FaSearch, FaDownload, FaBookmark, FaRegBookmark, FaSpinner, FaSignInAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API_URL = 'http://localhost:5002/api';

const StudyMaterials = () => {
  const { currentUser, isAuthenticated } = useAuth();
  
  // State for files and UI
  const [files, setFiles] = useState([]);
  const [bookmarkedFiles, setBookmarkedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Track loading states for specific files
  const [loadingStates, setLoadingStates] = useState({
    download: null,
    bookmark: null
  });
  
  // Filter state
  const [filters, setFilters] = useState({
    branch: '',
    year: '',
    type: '',
    subject: ''
  });
  
  // Filtered files
  const [filteredFiles, setFilteredFiles] = useState([]);
  
  // Fetch files on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch approved files
        const filesResponse = await axios.get(`${API_URL}/files?status=approved`);
        setFiles(filesResponse.data.files || []);
        
        // Fetch bookmarked files if user is authenticated
        if (isAuthenticated) {
          const bookmarksResponse = await axios.get(`${API_URL}/files/bookmarks`);
          setBookmarkedFiles(bookmarksResponse.data.files || []);
        }
      } catch (err) {
        console.error('Error fetching files:', err);
        setError('Failed to load files. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [isAuthenticated]);
  
  // Apply search and filters whenever files, search query or filters change
  useEffect(() => {
    if (!files || files.length === 0) {
      setFilteredFiles([]);
      return;
    }
    
    // Apply filters and search
    let results = [...files];
    
    // Apply text search if provided
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(file => 
        file.title.toLowerCase().includes(query) ||
        (file.description && file.description.toLowerCase().includes(query)) ||
        (file.subject && file.subject.toLowerCase().includes(query)) ||
        (file.type && file.type.toLowerCase().includes(query))
      );
    }
    
    // Apply branch filter
    if (filters.branch) {
      results = results.filter(file => file.branch === filters.branch);
    }
    
    // Apply year filter
    if (filters.year) {
      results = results.filter(file => file.year === filters.year);
    }
    
    // Apply type filter
    if (filters.type) {
      results = results.filter(file => file.type === filters.type);
    }
    
    // Apply subject filter
    if (filters.subject) {
      const subjectQuery = filters.subject.toLowerCase();
      results = results.filter(file => 
        file.subject && file.subject.toLowerCase().includes(subjectQuery)
      );
    }
    
    setFilteredFiles(results);
  }, [files, searchQuery, filters]);
  
  // Handle search input change
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };
  
  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      branch: '',
      year: '',
      type: '',
      subject: ''
    });
    setSearchQuery('');
  };
  
  // Handle file download
  const handleDownload = async (fileId) => {
    if (!fileId) return;
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      setError('Please log in to download files');
      return;
    }
    
    // Set loading state for this specific download
    setLoadingStates(prev => ({ ...prev, download: fileId }));
    
    try {
      // Make sure we have the token in the header
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await axios.get(`${API_URL}/files/${fileId}/download`);
      
      if (!response.data || !response.data.fileContent) {
        throw new Error('No file content returned from server');
      }
      
      // Extract file info from response
      const { fileContent, fileName, fileType } = response.data;
      
      // Create a blob from the file content
      const base64Data = fileContent.includes(',') ? fileContent.split(',')[1] : fileContent;
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
      
      const blob = new Blob(byteArrays, { type: `application/${fileType}` });
      
      // Create a download link and trigger it
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName || `download.${fileType || 'pdf'}`;
      document.body.appendChild(a);
      
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('File downloaded successfully');
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Failed to download file. Please try again.');
    } finally {
      // Clear loading state
      setLoadingStates(prev => ({ ...prev, download: null }));
    }
  };
  
  // Handle bookmark toggle
  const handleBookmarkToggle = async (fileId) => {
    if (!isAuthenticated) {
      alert('Please log in to bookmark files');
      return;
    }
    
    // Set loading state for this specific bookmark action
    setLoadingStates(prev => ({ ...prev, bookmark: fileId }));
    
    try {
      const response = await axios.post(`${API_URL}/files/${fileId}/bookmark`);
      const { isBookmarked } = response.data;
      
      if (isBookmarked) {
        // Add to bookmarked files if not already present
        const file = files.find(f => f._id === fileId);
        if (file && !bookmarkedFiles.some(f => f._id === fileId)) {
          setBookmarkedFiles(prev => [file, ...prev]);
        }
      } else {
        // Remove from bookmarked files
        setBookmarkedFiles(prev => prev.filter(file => file._id !== fileId));
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
      setError('Failed to bookmark file. Please try again.');
    } finally {
      // Clear loading state
      setLoadingStates(prev => ({ ...prev, bookmark: null }));
    }
  };
  
  // Check if a file is bookmarked
  const isBookmarked = (fileId) => {
    return bookmarkedFiles.some(file => file._id === fileId);
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Find unique branch values for filter dropdown
  const branches = [...new Set(files.map(f => f.branch).filter(Boolean))];
  
  // Find unique file types for filter dropdown
  const fileTypes = [...new Set(files.map(f => f.type).filter(Boolean))];
  
  // Render download or login button based on authentication status
  const renderDownloadButton = (fileId) => {
    if (isAuthenticated) {
      return (
        <button
          onClick={() => handleDownload(fileId)}
          disabled={loadingStates.download === fileId}
          className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
          title="Download file"
        >
          {loadingStates.download === fileId ? (
            <FaSpinner className="animate-spin" />
          ) : (
            <FaDownload />
          )}
          Download
        </button>
      );
    } else {
      return (
        <Link
          to="/login?redirect=study-materials"
          className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
          title="Login to download"
        >
          <FaSignInAlt />
          Login to Download
        </Link>
      );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Study Materials</h1>
        <p className="text-gray-600 mt-2">
          Browse and download study materials uploaded by students and faculty
        </p>
      </div>
      
      {/* Search and filter section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search by title, subject, or description..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center justify-center"
          >
            <FaFilter className="mr-2" />
            Filters {showFilters ? '(Hide)' : '(Show)'}
          </button>
        </div>
        
        {/* Filter panel - conditionally displayed */}
        {showFilters && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <select
                  name="branch"
                  value={filters.branch}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">All Branches</option>
                  {branches.map((branch, index) => (
                    <option key={index} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  name="year"
                  value={filters.year}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">All Years</option>
                  <option value="First Year">First Year</option>
                  <option value="Second Year">Second Year</option>
                  <option value="Third Year">Third Year</option>
                  <option value="Fourth Year">Fourth Year</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Type</label>
                <select
                  name="type"
                  value={filters.type}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">All Types</option>
                  {fileTypes.map((type, index) => (
                    <option key={index} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={filters.subject}
                  onChange={handleFilterChange}
                  placeholder="Enter subject name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
        
        {/* Display error message if there is one */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Loading indicator */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <FaSpinner className="animate-spin text-3xl text-blue-500 mr-3" />
            <span className="text-lg text-gray-600">Loading materials...</span>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No study materials found</h3>
            <p className="mt-1 text-gray-500">
              {searchQuery || filters.branch || filters.year || filters.type || filters.subject
                ? "Try adjusting your search or filters to find what you're looking for."
                : "No study materials have been uploaded yet."}
            </p>
          </div>
        ) : (
          /* File cards grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFiles.map((file) => (
              <div key={file._id} className="bg-white rounded-lg shadow-sm overflow-hidden transition-transform hover:translate-y-[-5px] hover:shadow-lg border border-gray-100">
                <div className="relative bg-indigo-50 pt-8 pb-10 flex items-center justify-center">
                  <div className="absolute top-2 right-2">
                    <button 
                      onClick={() => handleBookmarkToggle(file._id)}
                      className={`p-1.5 rounded-full ${isBookmarked(file._id) ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'} transition-colors bg-white/80`}
                      disabled={loadingStates.bookmark === file._id}
                      aria-label={isBookmarked(file._id) ? "Remove bookmark" : "Add bookmark"}
                    >
                      {loadingStates.bookmark === file._id ? (
                        <FaSpinner className="animate-spin" />
                      ) : isBookmarked(file._id) ? (
                        <FaBookmark />
                      ) : (
                        <FaRegBookmark />
                      )}
                    </button>
                  </div>
                  {file.type && (
                    <div className="absolute top-2 left-2">
                      <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded-md">
                        {file.type}
                      </span>
                    </div>
                  )}
                  <div className="relative">
                    <svg className="h-16 w-16 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
                      <path fill="currentColor" d="M181.9 256.1c-5-16-4.9-46.9-2-46.9 8.4 0 7.6 36.9 2 46.9zm-1.7 47.2c-7.7 20.2-17.3 43.3-28.4 62.7 18.3-7 39-17.2 62.9-21.9-12.7-9.6-24.9-23.4-34.5-40.8zM86.1 428.1c0 .8 13.2-5.4 34.9-40.2-6.7 6.3-29.1 24.5-34.9 40.2zM248 160h136v328c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V24C0 10.7 10.7 0 24 0h200v136c0 13.2 10.8 24 24 24zm-8 171.8c-20-12.2-33.3-29-42.7-53.8 4.5-18.5 11.6-46.6 6.2-64.2-4.7-29.4-42.4-26.5-47.8-6.8-5 18.3-.4 44.1 8.1 77-11.6 27.6-28.7 64.6-40.8 85.8-.1 0-.1.1-.2.1-27.1 13.9-73.6 44.5-54.5 68 5.6 6.9 16 10 21.5 10 17.9 0 35.7-18 61.1-61.8 25.8-8.5 54.1-19.1 79-23.2 21.7 11.8 47.1 19.5 64 19.5 29.2 0 31.2-32 19.7-43.4-13.9-13.6-54.3-9.7-73.6-7.2zM377 105L279 7c-4.5-4.5-10.6-7-17-7h-6v128h128v-6.1c0-6.3-2.5-12.4-7-16.9zm-74.1 255.3c4.1-2.7-2.5-11.9-42.8-9 37.1 15.8 42.8 9 42.8 9z"/>
                    </svg>
                    <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs py-0.5 text-center">
                      {file.fileType?.toUpperCase() || 'PDF'}
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2 truncate" title={file.title}>{file.title}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2" title={file.description}>
                    {file.description || 'No description provided'}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {file.branch && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-md">
                        {file.branch}
                      </span>
                    )}
                    {file.year && (
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-md">
                        {file.year}
                      </span>
                    )}
                    {file.subject && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-md">
                        {file.subject}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-gray-500" title="Upload date">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(file.createdAt)}
                    </span>
                    
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        onClick={() => handleBookmarkToggle(file._id)}
                        disabled={loadingStates.bookmark === file._id}
                        className={`text-sm ${isBookmarked(file._id) ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'} transition-colors`}
                        title={isBookmarked(file._id) ? "Remove bookmark" : "Bookmark for later"}
                      >
                        {loadingStates.bookmark === file._id ? (
                          <FaSpinner className="animate-spin" />
                        ) : isBookmarked(file._id) ? (
                          <FaBookmark />
                        ) : (
                          <FaRegBookmark />
                        )}
                      </button>
                      
                      {renderDownloadButton(file._id)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyMaterials; 