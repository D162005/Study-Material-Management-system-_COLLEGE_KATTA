import React, { useState, useEffect, useCallback } from 'react';
import { FaSearch, FaFilter, FaFileAlt, FaFilePdf, FaFileImage, FaFileWord, FaFileArchive, FaFileExcel, FaFilePowerpoint, FaDownload, FaBookmark, FaCheck } from 'react-icons/fa';
import { useFileContext } from '../context/FileContext';

const Saved = () => {
  const { bookmarkedFiles, toggleBookmark, downloadFile, isFileBookmarked } = useFileContext();
  const [savedFiles, setSavedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    branch: '',
    year: '',
    subject: '',
    type: ''
  });
  const [downloadingFiles, setDownloadingFiles] = useState({});
  
  // File type options
  const fileTypes = ['Notes', 'Question Paper (PYQ)', 'Lab Manual', 'Project'];
  const branches = ['Computer Science', 'Computer Engineering', 'Information Technology', 'AI & DS'];
  const years = ['First Year', 'Second Year', 'Third Year', 'Fourth Year'];
  
  // Define filterSavedFiles as useCallback to avoid recreation on each render
  const filterSavedFiles = useCallback(() => {
    if (!bookmarkedFiles || bookmarkedFiles.length === 0) {
      setSavedFiles([]);
      return;
    }
    
    // Filter based on search term and filters
    const filteredFiles = bookmarkedFiles.filter(file => {
      // Search term filter
      const matchesSearch = !searchTerm || 
        file.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (file.description && file.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Other filters
      const matchesBranch = !filters.branch || file.branch === filters.branch;
      const matchesYear = !filters.year || file.year === filters.year; 
      const matchesType = !filters.type || file.type === filters.type;
      
      return matchesSearch && matchesBranch && matchesYear && matchesType;
    });
    
    setSavedFiles(filteredFiles);
  }, [bookmarkedFiles, searchTerm, filters]);
  
  // Update saved files when bookmarkedFiles changes or filters change
  useEffect(() => {
    setLoading(true);
    filterSavedFiles();
    setLoading(false);
  }, [bookmarkedFiles, filterSavedFiles]);
  
  const handleSearch = (e) => {
    e.preventDefault();
    filterSavedFiles();
  };
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const clearFilters = () => {
    setFilters({
      branch: '',
      year: '',
      subject: '',
      type: ''
    });
    setSearchTerm('');
    
    // Reset to all bookmarked files
    setSavedFiles(bookmarkedFiles);
  };
  
  const handleToggleBookmark = (fileId) => {
    // Call the context function to toggle bookmark
    toggleBookmark(fileId);

    // We'll immediately remove the file from the UI for better UX
    // The file should be removed from the saved files list when unbookmarked
    setSavedFiles(prev => prev.filter(file => file._id !== fileId));
  };
  
  const handleDownload = (fileId) => {
    // Set downloading state for this file
    setDownloadingFiles(prev => ({ ...prev, [fileId]: true }));
    
    // Download the file
    const filename = downloadFile(fileId);
    
    // Show downloading state for 1.5 seconds to provide feedback
    setTimeout(() => {
      setDownloadingFiles(prev => ({ ...prev, [fileId]: false }));
    }, 1500);
  };
  
  // Function to get the appropriate icon based on file type
  const getFileIcon = (fileType) => {
    switch(fileType.toLowerCase()) {
      case 'pdf': return <FaFilePdf className="text-red-500 text-6xl" />;
      case 'doc':
      case 'docx': return <FaFileWord className="text-blue-500 text-6xl" />;
      case 'xls':
      case 'xlsx': return <FaFileExcel className="text-green-500 text-6xl" />;
      case 'ppt':
      case 'pptx': return <FaFilePowerpoint className="text-orange-500 text-6xl" />;
      case 'jpg':
      case 'jpeg':
      case 'png': return <FaFileImage className="text-purple-500 text-6xl" />;
      case 'zip':
      case 'rar': return <FaFileArchive className="text-yellow-600 text-6xl" />;
      default: return <FaFileAlt className="text-gray-500 text-6xl" />;
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  // Function to check if the saved files list is empty
  const isSavedEmpty = () => {
    return !savedFiles || savedFiles.length === 0;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">Saved Materials</h1>
          
          <div className="flex w-full md:w-auto space-x-2">
            <form onSubmit={handleSearch} className="flex-1 md:flex-initial">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search saved materials..."
                  className="w-full md:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-gray-400" />
                </div>
              </div>
            </form>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center bg-white text-blue-700 border border-gray-300 rounded-md px-4 py-2 hover:bg-blue-50 transition-colors"
            >
              <FaFilter className="mr-2" />
              <span>Filter</span>
            </button>
          </div>
        </div>
        
        {/* Filters */}
        {showFilters && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-100 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <select
                  name="branch"
                  value={filters.branch}
                  onChange={handleFilterChange}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Branches</option>
                  {branches.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  name="year"
                  value={filters.year}
                  onChange={handleFilterChange}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Years</option>
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  name="subject"
                  placeholder="Any subject"
                  value={filters.subject}
                  onChange={handleFilterChange}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  name="type"
                  value={filters.type}
                  onChange={handleFilterChange}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  {fileTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <button
                onClick={clearFilters}
                className="text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-md mr-2"
              >
                Clear filters
              </button>
              <button
                onClick={handleSearch}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Apply filters
              </button>
            </div>
          </div>
        )}
        
        {/* Files List */}
        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : isSavedEmpty() ? (
            <div className="text-center py-20 bg-gray-50 rounded-lg border border-gray-200">
              <FaBookmark className="text-gray-400 text-5xl mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-700 mb-2">No saved materials</h3>
              <p className="text-gray-500">You haven't saved any study materials yet or none match your search criteria.</p>
              <button 
                onClick={() => window.location.href = '/'}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                Browse study materials
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedFiles.map((file) => (
                <div key={file._id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative bg-blue-50 pt-8 pb-10 flex items-center justify-center h-44">
                    <div className="absolute top-2 right-2">
                      <button 
                        onClick={() => handleToggleBookmark(file._id)}
                        className="p-1.5 rounded-full text-yellow-500 hover:text-yellow-600 transition-colors bg-white/80"
                        aria-label="Remove from saved"
                      >
                        <FaBookmark />
                      </button>
                    </div>
                    {file.type && (
                      <div className="absolute top-2 left-2">
                        <span className="bg-blue-700 text-white text-xs px-2 py-1 rounded-md">
                          {file.type}
                        </span>
                      </div>
                    )}
                    <div className="relative">
                      {getFileIcon(file.fileType)}
                      <div className="absolute -bottom-2 left-0 right-0 bg-red-500 text-white text-xs py-0.5 text-center w-16 mx-auto rounded-sm">
                        {file.fileType?.toUpperCase() || 'FILE'}
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 truncate">{file.title}</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><span className="font-medium">Branch:</span> {file.branch}</p>
                      <p><span className="font-medium">Year:</span> {file.year}</p>
                      <p><span className="font-medium">Subject:</span> {file.subject}</p>
                      <p><span className="font-medium">Saved on:</span> {formatDate(file.createdAt)}</p>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button 
                        onClick={() => handleDownload(file._id)}
                        className={`flex items-center space-x-1 ${downloadingFiles[file._id] ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'} border rounded-md px-3 py-1.5 text-sm transition-colors shadow-sm`}
                        disabled={downloadingFiles[file._id]}
                      >
                        {downloadingFiles[file._id] ? (
                          <>
                            <FaCheck className="mr-1" size={14} />
                            <span>Downloaded</span>
                          </>
                        ) : (
                          <>
                        <FaDownload className="mr-1" size={14} />
                        <span>Download</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Saved; 