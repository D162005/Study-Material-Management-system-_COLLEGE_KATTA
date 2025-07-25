import React, { useState, useEffect } from 'react';
import { FaSearch, FaDownload, FaBookmark, FaRegBookmark, FaSpinner, FaFilter, FaFlask } from 'react-icons/fa';
import { useFileContext } from '../context/FileContext';

const LabManual = () => {
  const { searchFiles, toggleBookmark, downloadFile, isFileBookmarked, bookmarkedFiles } = useFileContext();
  const [labManuals, setLabManuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    branch: '',
    year: '',
    subject: '',
    experimentType: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  // Track loading states for specific files
  const [loadingStates, setLoadingStates] = useState({
    download: null,
    bookmark: null
  });
  
  // Options for filters
  const branches = ['Computer Science', 'Information Technology', 'Electronics', 'Electrical', 'Mechanical', 'Civil', 'Chemical'];
  const years = ['First Year', 'Second Year', 'Third Year', 'Fourth Year'];
  const experimentTypes = ['Manual', 'Report', 'Code', 'Diagram', 'Data Sheet'];
  
  useEffect(() => {
    const fetchLabManuals = async () => {
      setLoading(true);
      try {
        // Get files with type "Lab Manual"
        const files = searchFiles('', { type: 'Lab Manual' });
        setLabManuals(files);
      } catch (error) {
        console.error('Error fetching lab manuals:', error);
        setLabManuals([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLabManuals();
  }, [searchFiles, bookmarkedFiles]);
  
  const handleSearch = (e) => {
    e.preventDefault();
    const searchFilters = { type: 'Lab Manual', ...filters };
    const results = searchFiles(searchTerm, searchFilters);
    setLabManuals(results);
  };
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const updatedFilters = {
      ...filters,
      [name]: value
    };
    setFilters(updatedFilters);
    
    // Automatically apply filters when they change
    const searchFilters = { type: 'Lab Manual', ...updatedFilters };
    const results = searchFiles(searchTerm, searchFilters);
    setLabManuals(results);
  };
  
  const clearFilters = () => {
    setFilters({
      branch: '',
      year: '',
      subject: '',
      experimentType: ''
    });
    setSearchTerm('');
    
    // Reset to all lab manuals
    const files = searchFiles('', { type: 'Lab Manual' });
    setLabManuals(files);
  };
  
  const handleToggleBookmark = (fileId) => {
    const newBookmarkState = toggleBookmark(fileId);
    
    // Set loading state
    setLoadingStates(prev => ({ ...prev, bookmark: fileId }));
    
    // Update the UI to reflect the new bookmark state
    setLabManuals(prev => 
      prev.map(file => 
        file._id === fileId ? { ...file, bookmarked: newBookmarkState } : file
      )
    );
    
    // Clear loading state
    setTimeout(() => {
      setLoadingStates(prev => ({ ...prev, bookmark: null }));
    }, 300);
  };
  
  const handleDownload = (fileId) => {
    // Set loading state
    setLoadingStates(prev => ({ ...prev, download: fileId }));
    
    downloadFile(fileId);
    
    setLabManuals(prev => 
      prev.map(file => 
        file._id === fileId ? { ...file, downloadCount: file.downloadCount + 1 } : file
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
          <FaFlask className="text-indigo-600 mr-3" />
          Laboratory Manuals
        </h1>
        <p className="text-gray-600 mt-2">
          Browse and download laboratory manuals, reports, and experiment guides
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
                const searchFilters = { type: 'Lab Manual', ...filters };
                const results = searchFiles(newSearchTerm, searchFilters);
                setLabManuals(results);
              }}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Type</label>
                <select
                  name="experimentType"
                  value={filters.experimentType}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">All Types</option>
                  {experimentTypes.map((type, index) => (
                    <option key={index} value={type}>{type}</option>
                  ))}
                </select>
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
                className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
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
            <span className="text-lg text-gray-600">Loading lab manuals...</span>
          </div>
        ) : labManuals.length === 0 ? (
          <div className="text-center py-16">
            <FaFlask className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No lab manuals found</h3>
            <p className="mt-1 text-gray-500">
              {searchTerm || filters.branch || filters.year || filters.subject || filters.experimentType
                ? "Try adjusting your search or filters to find what you're looking for."
                : "No lab manuals have been uploaded yet."}
            </p>
          </div>
        ) : (
          /* File cards grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {labManuals.map((file) => (
              <div key={file._id || file.id} className="bg-white rounded-lg shadow-sm overflow-hidden transition-transform hover:translate-y-[-5px] hover:shadow-lg border border-gray-100">
                <div className="relative bg-indigo-50 pt-8 pb-10 flex items-center justify-center">
                  <div className="absolute top-2 right-2">
                    <button 
                      onClick={() => handleToggleBookmark(file._id || file.id)}
                      className={`p-1.5 rounded-full ${isFileBookmarked(file._id || file.id) ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'} transition-colors bg-white/80`}
                      disabled={loadingStates.bookmark === (file._id || file.id)}
                      aria-label={isFileBookmarked(file._id || file.id) ? "Remove bookmark" : "Add bookmark"}
                    >
                      {loadingStates.bookmark === (file._id || file.id) ? (
                        <FaSpinner className="animate-spin" />
                      ) : isFileBookmarked(file._id || file.id) ? (
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
                  {file.experimentType && (
                    <div className="absolute bottom-2 left-2">
                      <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-md">
                        {file.experimentType}
                      </span>
                    </div>
                  )}
                  <div className="relative">
                    <svg className="h-16 w-16 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
                      <path fill="currentColor" d="M128 224c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm64-96c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm-64 192c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm64-96c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm364.1-194.1L465 7c-9.4-9.4-24.6-9.4-33.9 0L340.9 97.1c-9.4 9.4-9.4 24.6 0 33.9l62.1 62.1-114.1 114.1c-15.6 15.6-15.6 40.9 0 56.6 15.6 15.6 40.9 15.6 56.6 0l114.1-114.1 62.1 62.1c9.4 9.4 24.6 9.4 33.9 0l90.2-90.2c9.4-9.4 9.4-24.6 0-33.9L556.1 97.1l-62.1 62.1-45.2-45.2 62.1-62.1-45.2-45.2-62.1 62.1-45.2-45.2 62.1-62.1zm-90.2 90.2l45.2 45.2-225 225L88.9 417.2c-50 50-50 131 0 181s131 50 181 0l67.9-67.9-45.3-45.2-67.9 67.9c-31.2 31.2-81.9 31.2-113.1 0-31.2-31.2-31.2-81.9 0-113.1l114.2-114.2 225-225z" />
                    </svg>
                    <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-xs py-0.5 text-center">
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
                      onClick={() => handleDownload(file._id || file.id)}
                      className="flex items-center gap-1 text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                      disabled={loadingStates.download === (file._id || file.id)}
                    >
                      {loadingStates.download === (file._id || file.id) ? (
                        <FaSpinner className="animate-spin mr-1" />
                      ) : (
                        <FaDownload className="mr-1" />
                      )}
                      Download
                    </button>
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

export default LabManual; 