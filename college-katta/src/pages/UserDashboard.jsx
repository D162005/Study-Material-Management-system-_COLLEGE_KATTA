import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaUpload, FaBookmark, FaDownload, FaFileAlt, FaFileWord, FaFilePdf, FaSearch, FaChartBar } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useFileContext } from '../context/FileContext';
import { useStudyMaterial } from '../context/StudyMaterialContext';
import { formatDate, formatYearToText } from '../utils/formatUtils';
import axios from 'axios';

const UserDashboard = () => {
  const { currentUser } = useAuth();
  const { myUploads, bookmarkedFiles, downloadFile, toggleBookmark } = useFileContext();
  const { bookmarkedMaterials, downloadMaterial, toggleBookmarkStudyMaterial } = useStudyMaterial();
  const [stats, setStats] = useState({
    totalUploads: 0,
    totalBookmarks: 0,
    totalDownloads: 0
  });
  const [recentUploads, setRecentUploads] = useState([]);
  const [recentBookmarks, setRecentBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fileIcons = {
    'pdf': <FaFilePdf className="text-red-500" />,
    'doc': <FaFileWord className="text-blue-500" />,
    'docx': <FaFileWord className="text-blue-500" />,
    'default': <FaFileAlt className="text-gray-500" />
  };
  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Use only files from FileContext
        const allUploads = [
          ...myUploads.map(file => ({ ...file, isFile: true }))
        ];
        
        const allBookmarks = [
          ...bookmarkedFiles.map(file => ({ ...file, isFile: true })),
          ...bookmarkedMaterials.map(material => ({ ...material, isStudyMaterial: true }))
        ];
        
        // Sort by creation date (newest first)
        const sortedUploads = allUploads.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        const sortedBookmarks = allBookmarks.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        // Get the 5 most recent uploads and bookmarks
        setRecentUploads(sortedUploads.slice(0, 5));
        setRecentBookmarks(sortedBookmarks.slice(0, 5));
        
        // Set stats with actual counts
        setStats({
          totalUploads: myUploads.length,
          totalBookmarks: bookmarkedFiles.length + bookmarkedMaterials.length,
          // Sum up download counts from user's uploads
          totalDownloads: [
            ...myUploads
          ].reduce((sum, file) => sum + (file.downloadCount || 0), 0)
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error processing user data:', err);
        setError('Failed to load user dashboard data');
        setLoading(false);
      }
    };
    
    if (currentUser) {
      fetchUserData();
    }
  }, [
    currentUser, 
    myUploads, 
    bookmarkedFiles, 
    bookmarkedMaterials
  ]);
  
  const getFileIcon = (fileType) => {
    return fileIcons[fileType] || fileIcons.default;
  };
  
  // Handle download for both file types
  const handleDownload = (item) => {
    if (item.isFile) {
      // Use FileContext download function
      downloadFile(item._id);
    } else if (item.isStudyMaterial) {
      // Use StudyMaterial download function
      downloadMaterial(item._id);
    }
  };
  
  // Handle bookmark toggle for both file types
  const handleToggleBookmark = (item) => {
    if (item.isFile) {
      // Use FileContext toggle function
      toggleBookmark(item._id);
    } else if (item.isStudyMaterial) {
      // Use StudyMaterial toggle function
      toggleBookmarkStudyMaterial(item._id);
    }
  };
  
  // Get title based on item type
  const getItemTitle = (item) => {
    return item.title || 'Untitled';
  };
  
  // Get file/item type display name
  const getItemTypeName = (item) => {
    if (item.isFile) {
      return item.type || 'File';
    } else {
      return item.materialType || 'Study Material';
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">My Dashboard</h1>
        <p className="text-gray-600">Welcome back, {currentUser?.fullName || 'User'}!</p>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 flex items-center">
          <div className="rounded-full bg-blue-100 p-3 mr-4">
            <FaUpload className="text-blue-600 text-xl" />
          </div>
          <div>
            <p className="text-gray-500 text-sm">My Uploads</p>
            <p className="text-2xl font-bold text-gray-800">{stats.totalUploads}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 flex items-center">
          <div className="rounded-full bg-purple-100 p-3 mr-4">
            <FaBookmark className="text-purple-600 text-xl" />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Saved Materials</p>
            <p className="text-2xl font-bold text-gray-800">{stats.totalBookmarks}</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Uploads */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">My Recent Uploads</h2>
            <Link to="/my-uploads" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All
            </Link>
          </div>
          
          {recentUploads.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-gray-500">You haven't uploaded any files yet</p>
              <button
                onClick={() => document.getElementById('uploadButton').click()}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <FaUpload className="mr-2" />
                Upload Now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentUploads.map(item => (
                <div key={item._id} className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-4">
                      {getFileIcon(item.fileType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800 truncate">{getItemTitle(item)}</h3>
                      <p className="text-sm text-gray-500">
                        {item.branch} • {getItemTypeName(item)}
                      </p>
                      <div className="flex items-center mt-1 text-xs text-gray-400">
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {item.status || 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Bookmarked Files */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Saved Materials</h2>
            <Link to="/saved" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All
            </Link>
          </div>
          
          {recentBookmarks.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-gray-500">You haven't saved any materials yet</p>
              <Link
                to="/study-material"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <FaSearch className="mr-2" />
                Browse Materials
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentBookmarks.map(item => (
                <div key={item._id} className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-4">
                      {getFileIcon(item.fileType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800 truncate">{getItemTitle(item)}</h3>
                      <p className="text-sm text-gray-500">
                        {item.branch} • {getItemTypeName(item)}
                      </p>
                      <div className="flex items-center mt-1 text-xs text-gray-400">
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex space-x-2 ml-2">
                      <button
                        onClick={() => handleDownload(item)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Download"
                      >
                        <FaDownload />
                      </button>
                      <button
                        onClick={() => handleToggleBookmark(item)}
                        className="text-purple-600 hover:text-purple-800"
                        title="Remove Bookmark"
                      >
                        <FaBookmark />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Activity Chart */}
      <div className="mt-8 bg-white rounded-lg shadow-sm p-6 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Activity Overview</h2>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center">
            <FaChartBar className="text-6xl text-blue-600 mr-4" />
            <div>
              <p className="text-gray-500">
                Your activity statistics will be available after more usage.
              </p>
              <p className="text-gray-500 mt-2">
                Continue uploading and downloading materials to see your trends!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard; 