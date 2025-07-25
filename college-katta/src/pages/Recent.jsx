import React, { useState, useEffect } from 'react';
import { FaSearch, FaFileAlt, FaFilePdf, FaFileImage, FaFileWord, FaFileArchive, FaFileExcel, FaFilePowerpoint, FaDownload, FaBookmark } from 'react-icons/fa';
import { useFileContext } from '../context/FileContext';
import { useAuth } from '../context/AuthContext';

const Recent = () => {
  const { searchFiles, toggleBookmark, downloadFile, isFileBookmarked, recentFiles: contextRecentFiles, loading: contextLoading } = useFileContext();
  const { isAuthenticated } = useAuth();
  const [recentFiles, setRecentFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    // Set loading state while waiting for context
    setLoading(contextLoading);
    
    // When contextRecentFiles changes, update our local state
    if (contextRecentFiles && contextRecentFiles.length > 0) {
      console.log('Recent: Received', contextRecentFiles.length, 'files from context');
      const sorted = [...contextRecentFiles].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      setRecentFiles(sorted);
      setLoading(false);
    } else if (!contextLoading) {
      console.log('Recent: No files received from context');
      setRecentFiles([]);
      setLoading(false);
    }
  }, [contextRecentFiles, contextLoading]);
  
  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (!searchTerm.trim()) {
      // If search is empty, reset to show recent files sorted by date
      const sorted = [...contextRecentFiles].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      setRecentFiles(sorted);
    } else {
      // Search with term
      const results = searchFiles(searchTerm);
      setRecentFiles(results);
    }
    
    setLoading(false);
  };
  
  const handleToggleBookmark = async (fileId) => {
    if (!isAuthenticated) {
      alert('Please log in to bookmark files');
      return;
    }
    
    try {
      await toggleBookmark(fileId);
      // No need to update local state, the context will handle it
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };
  
  const handleDownload = async (fileId) => {
    setLoading(true);
    try {
      await downloadFile(fileId);
      // The download count update will be handled by the context
    } catch (error) {
      console.error('Error downloading file:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to get the appropriate icon based on file type
  const getFileIcon = (fileType) => {
    switch(fileType.toLowerCase()) {
      case 'pdf': return <FaFilePdf className="text-red-500" />;
      case 'doc':
      case 'docx': return <FaFileWord className="text-blue-500" />;
      case 'xls':
      case 'xlsx': return <FaFileExcel className="text-green-500" />;
      case 'ppt':
      case 'pptx': return <FaFilePowerpoint className="text-orange-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png': return <FaFileImage className="text-purple-500" />;
      case 'zip':
      case 'rar': return <FaFileArchive className="text-yellow-600" />;
      default: return <FaFileAlt className="text-gray-500" />;
    }
  };
  
  // Format date - e.g., "3 hours ago", "2 days ago"
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} days ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} months ago`;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">Recent Activity</h1>
          
          <form onSubmit={handleSearch} className="flex w-full md:w-64">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search recent files..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <button
                type="submit"
                className="absolute inset-y-0 right-0 px-3 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
              >
                Search
              </button>
            </div>
          </form>
        </div>
        
        {/* Files List */}
        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : recentFiles.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-lg border border-gray-200">
              <FaFileAlt className="text-gray-400 text-5xl mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-700 mb-2">No recent activity</h3>
              <p className="text-gray-500">You haven't viewed or accessed any files recently.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentFiles.map((file) => (
                <div key={file._id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-3">
                        <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-lg">
                          {getFileIcon(file.fileType)}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{file.title}</h3>
                          <div className="text-xs text-gray-500 mt-1">
                            {file.fileType.toUpperCase()} • {typeof file.fileSize === 'number' ? (file.fileSize / 1024).toFixed(1) + ' KB' : file.fileSize}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleBookmark(file._id)}
                        className={`p-1.5 ${isFileBookmarked(file._id) ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'} transition-colors`}
                        aria-label={isFileBookmarked(file._id) ? "Remove from saved" : "Save for later"}
                      >
                        <FaBookmark />
                      </button>
                    </div>
                    
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {file.description || 'No description provided'}
                      </p>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div><span className="font-medium">Branch:</span> {file.branch}</div>
                      <div><span className="font-medium">Year:</span> {file.year}</div>
                      <div><span className="font-medium">Subject:</span> {file.subject}</div>
                      <div><span className="font-medium">Type:</span> {file.type}</div>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {formatTimeAgo(file.createdAt)}
                      </div>
                      <button
                        onClick={() => handleDownload(file._id)}
                        className="flex items-center space-x-1 bg-white text-blue-700 border border-blue-200 rounded-md px-3 py-1.5 text-sm hover:bg-blue-50 shadow-sm"
                        disabled={loading}
                      >
                        <FaDownload size={14} />
                        <span>{loading ? 'Downloading...' : 'Download'}</span>
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

export default Recent; 