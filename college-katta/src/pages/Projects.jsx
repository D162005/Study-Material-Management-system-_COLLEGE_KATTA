import React, { useState, useEffect } from 'react';
import { FaSearch, FaDownload, FaBookmark, FaRegBookmark, FaSpinner, FaFilter, FaProjectDiagram } from 'react-icons/fa';
import { useFileContext } from '../context/FileContext';

const Projects = () => {
  const { searchFiles, toggleBookmark, downloadFile, isFileBookmarked, bookmarkedFiles } = useFileContext();
  const [projectFiles, setProjectFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    branch: '',
    year: '',
    subject: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  // Track loading states for specific files
  const [loadingStates, setLoadingStates] = useState({
    download: null,
    bookmark: null
  });
  
  // Helper function to safely get file ID (handles both _id and id formats)
  const getFileId = (file) => {
    if (!file) return null;
    return file._id || file.id || null;
  };
  
  // Options for filters
  const branches = ['Computer Science', 'Information Technology', 'Electronics', 'Electrical', 'Mechanical', 'Civil', 'Chemical'];
  const years = ['First Year', 'Second Year', 'Third Year', 'Fourth Year'];
  
  useEffect(() => {
    // In a real app, this would be an API call to get project files
    const fetchProjectFiles = async () => {
      setLoading(true);
      try {
        // Get files with type "Project"
        const files = searchFiles('', { type: 'Project' });
        console.log('Projects component received files:', files);
        setProjectFiles(files);
      } catch (error) {
        console.error('Error fetching project files:', error);
        setProjectFiles([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjectFiles();
  }, [searchFiles, bookmarkedFiles]);
  
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim() && !filters.branch && !filters.year && !filters.subject) {
      // If search is empty and no filters, reset to show all project files
      const files = searchFiles('', { type: 'Project' });
      setProjectFiles(files);
      return;
    }
    
    const searchFilters = { type: 'Project', ...filters };
    const results = searchFiles(searchTerm, searchFilters);
    setProjectFiles(results);
  };
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const updatedFilters = {
      ...filters,
      [name]: value
    };
    setFilters(updatedFilters);
    
    // Automatically apply filters when they change
    const searchFilters = { type: 'Project', ...updatedFilters };
    const results = searchFiles(searchTerm, searchFilters);
    setProjectFiles(results);
  };
  
  const clearFilters = () => {
    setFilters({
      branch: '',
      year: '',
      subject: ''
    });
    setSearchTerm('');
    
    // Reset to all project files
    const files = searchFiles('', { type: 'Project' });
    setProjectFiles(files);
  };
  
  const handleToggleBookmark = (fileId) => {
    // Validate fileId to prevent undefined values
    if (!fileId) {
      console.error('Cannot bookmark: File ID is undefined');
      return;
    }
    
    const newBookmarkState = toggleBookmark(fileId);
    
    // Set loading state
    setLoadingStates(prev => ({ ...prev, bookmark: fileId }));
    
    // Update the UI to reflect the new bookmark state using the helper function
    setProjectFiles(prev => 
      prev.map(file => 
        getFileId(file) === fileId ? { ...file, bookmarked: newBookmarkState } : file
      )
    );
    
    // Clear loading state
    setTimeout(() => {
      setLoadingStates(prev => ({ ...prev, bookmark: null }));
    }, 300);
  };
  
  const handleDownload = (fileId) => {
    // Validate fileId to prevent undefined values
    if (!fileId) {
      console.error('Cannot download: File ID is undefined');
      return;
    }
    
    // Set loading state
    setLoadingStates(prev => ({ ...prev, download: fileId }));
    
    downloadFile(fileId);
    
    // Update the UI using the helper function
    setProjectFiles(prev => 
      prev.map(file => 
        getFileId(file) === fileId ? { ...file, downloadCount: file.downloadCount + 1 } : file
      )
    );
    
    // Clear loading state
    setTimeout(() => {
      setLoadingStates(prev => ({ ...prev, download: null }));
    }, 500);
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <FaProjectDiagram className="text-indigo-600 mr-3" />
          Projects
        </h1>
        <p className="text-gray-600 mt-2">
          Browse and download projects and documentation
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
                value={searchTerm}
                onChange={(e) => {
                  const newSearchTerm = e.target.value;
                  setSearchTerm(newSearchTerm);
                  
                  // Apply search filter in real-time
                  const searchFilters = { type: 'Project', ...filters };
                  const results = searchFiles(newSearchTerm, searchFilters);
                  setProjectFiles(results);
                }}
                placeholder="Search by title, subject, or description..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  {years.map((year, index) => (
                    <option key={index} value={year}>{year}</option>
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
              <button
                onClick={handleSearch}
                className="ml-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
              >
                Apply Filters
              </button>
            </div>
        </div>
        )}
        
        {/* Loading indicator */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
            <FaSpinner className="animate-spin text-3xl text-blue-500 mr-3" />
            <span className="text-lg text-gray-600">Loading projects...</span>
            </div>
          ) : projectFiles.length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No project reports found</h3>
            <p className="mt-1 text-gray-500">
              {searchTerm || filters.branch || filters.year || filters.subject
                ? "Try adjusting your search or filters to find what you're looking for."
                : "No project reports have been uploaded yet."}
            </p>
            </div>
          ) : (
          /* File cards grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectFiles.map((file) => {
              const fileId = getFileId(file);
              return (
              <div key={fileId} className="bg-white rounded-lg shadow-sm overflow-hidden transition-transform hover:translate-y-[-5px] hover:shadow-lg border border-gray-100">
                <div className="relative bg-indigo-50 pt-8 pb-10 flex items-center justify-center">
                  <div className="absolute top-2 right-2">
                      <button
                      onClick={() => handleToggleBookmark(fileId)}
                      className={`p-1.5 rounded-full ${isFileBookmarked(fileId) ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'} transition-colors bg-white/80`}
                      disabled={loadingStates.bookmark === fileId}
                      aria-label={isFileBookmarked(fileId) ? "Remove bookmark" : "Add bookmark"}
                    >
                      {loadingStates.bookmark === fileId ? (
                        <FaSpinner className="animate-spin" />
                      ) : isFileBookmarked(fileId) ? (
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
                    <svg className="h-16 w-16 text-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
                      <path fill="currentColor" d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm160-14.1v6.1H256V0h6.1c6.4 0 12.5 2.5 17 7l97.9 98c4.5 4.5 7 10.6 7 16.9z"/>
                    </svg>
                    <div className="absolute bottom-0 left-0 right-0 bg-purple-500 text-white text-xs py-0.5 text-center">
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
                    
                      <button
                      onClick={() => handleDownload(fileId)}
                      className="flex items-center gap-1 text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                      disabled={loadingStates.download === fileId}
                    >
                      {loadingStates.download === fileId ? (
                        <FaSpinner className="animate-spin mr-1" />
                      ) : (
                        <FaDownload className="mr-1" />
                      )}
                      Download
                      </button>
                  </div>
                </div>
              </div>
              );
            })}
            </div>
          )}
      </div>
    </div>
  );
};

export default Projects; 