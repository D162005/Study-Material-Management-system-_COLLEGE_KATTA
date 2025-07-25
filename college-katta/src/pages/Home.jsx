import React, { useState, useEffect } from 'react';
import { FaFilePdf, FaDownload, FaBookmark, FaBook, FaClipboardList, FaFlask, FaUser, FaStar } from 'react-icons/fa';
import { useFileContext } from '../context/FileContext';
import { useStudyMaterial } from '../context/StudyMaterialContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Home = () => {
  const { 
    searchFiles, 
    toggleBookmark, 
    downloadFile, 
    isFileBookmarked, 
    bookmarkedFiles, 
    myUploads,
    recentFiles: contextRecentFiles 
  } = useFileContext();
  
  const {
    bookmarkedMaterials,
    toggleBookmark: toggleStudyMaterialBookmark,
    isBookmarked: isStudyMaterialBookmarked,
    downloadMaterial,
    materials: studyMaterials
  } = useStudyMaterial();
  
  const { currentUser, isAdmin, isAuthenticated } = useAuth();
  const [recentItems, setRecentItems] = useState([]);
  const [stats, setStats] = useState({
    totalUploads: 0,
    totalBookmarks: 0,
    totalDownloads: 0
  });
  
  // Update files when the context changes
  useEffect(() => {
    // Combine regular files and study materials
    const allFiles = [
      ...contextRecentFiles.map(file => ({ ...file, isFile: true })),
      ...studyMaterials.map(material => ({ ...material, isStudyMaterial: true }))
    ];
    
    // Sort by creation date (newest first)
    const sortedItems = allFiles.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    // Get the 6 most recent items
    setRecentItems(sortedItems.slice(0, 6));
  }, [contextRecentFiles, studyMaterials, bookmarkedFiles, bookmarkedMaterials]);
  
  // Load stats for logged-in user
  useEffect(() => {
    if (currentUser) {
      // Use actual data from context, combining files and study materials
      setStats({
        // Total of regular files uploads
        totalUploads: myUploads.length,
        // Total of bookmarked files and study materials
        totalBookmarks: bookmarkedFiles.length + bookmarkedMaterials.length,
        // Sum of download counts
        totalDownloads: [
          ...myUploads
        ].reduce((sum, file) => sum + (file.downloadCount || 0), 0)
      });
    }
  }, [
    currentUser, 
    myUploads, 
    bookmarkedFiles,
    bookmarkedMaterials
  ]);

  // Handle bookmark click for both types of items
  const handleToggleBookmark = (item) => {
    if (item.isFile) {
      // Regular file
      const newBookmarkState = toggleBookmark(item._id);
      updateItemBookmarkState(item._id, newBookmarkState, true);
    } else if (item.isStudyMaterial) {
      // Study material
      const newBookmarkState = toggleStudyMaterialBookmark(item._id);
      updateItemBookmarkState(item._id, newBookmarkState, false);
    }
  };
  
  // Update the bookmark state in the UI
  const updateItemBookmarkState = (itemId, newState, isFile) => {
    setRecentItems(prevItems => 
      prevItems.map(item => 
        (item._id === itemId && item.isFile === isFile) 
          ? { ...item, bookmarked: newState } 
          : item
      )
    );
  };

  // Get the bookmark button class based on bookmark status
  const getBookmarkButtonClass = (item) => {
    let isBookmarked = false;
    
    if (item.isFile) {
      isBookmarked = isFileBookmarked(item._id);
    } else if (item.isStudyMaterial) {
      isBookmarked = isStudyMaterialBookmarked(item._id);
    }
    
    return isBookmarked 
      ? 'text-yellow-500 hover:text-yellow-600' 
      : 'text-gray-400 hover:text-yellow-500';
  };
  
  // Handle download for an item
  const handleDownload = (item) => {
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      window.location.href = '/login?redirect=study-materials';
      return;
    }
    
    if (item.isFile) {
      downloadFile(item._id);
    } else if (item.isStudyMaterial) {
      downloadMaterial(item._id);
    }
  };
  
  // Get the item type display name
  const getItemTypeName = (item) => {
    if (item.isFile) {
      return item.type || 'File';
    } else if (item.isStudyMaterial) {
      return item.materialType || 'Study Material';
    }
    return 'Document';
  };

  return (
    <div className="container mx-auto px-4">
      {/* Welcome Header */}
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          {currentUser ? `Welcome back, ${currentUser.fullName || currentUser.username}` : 'Welcome to College Katta'}
        </h1>
        <p className="text-md text-gray-600 mt-2">
          {currentUser ? 'Your one-stop solution for all academic resources' : 'Login to access all academic resources'}
        </p>
      </header>

      {currentUser ? (
        // Dashboard view for logged-in users
        <>
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Uploads</p>
                    <h3 className="text-2xl font-bold">{stats.totalUploads}</h3>
                  </div>
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
                    <FaDownload />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Bookmarks</p>
                    <h3 className="text-2xl font-bold">{stats.totalBookmarks}</h3>
                  </div>
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-full">
                    <FaBookmark />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Quick Links */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8 border border-gray-100">
              <h2 className="text-lg font-semibold mb-4">Quick Access</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link to="/notes" className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 transition-colors">
                  <FaBook className="text-indigo-600 text-2xl mb-2" />
                  <span className="text-sm text-gray-700">Notes</span>
                </Link>
                
                <Link to="/pyq" className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 transition-colors">
                  <FaClipboardList className="text-indigo-600 text-2xl mb-2" />
                  <span className="text-sm text-gray-700">PYQ</span>
                </Link>
                
                <Link to="/lab-manual" className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 transition-colors">
                  <FaFlask className="text-indigo-600 text-2xl mb-2" />
                  <span className="text-sm text-gray-700">Lab Manual</span>
                </Link>
                
                <Link to="/profile" className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 transition-colors">
                  <FaUser className="text-indigo-600 text-2xl mb-2" />
                  <span className="text-sm text-gray-700">Profile</span>
                </Link>
              </div>
            </div>
            
            {/* Admin Quick Links */}
            {isAdmin() && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-8 border border-gray-100">
                <h2 className="text-lg font-semibold mb-4">Admin Controls</h2>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                  <Link to="/admin/users" className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 transition-colors">
                    <FaUser className="text-rose-600 text-2xl mb-2" />
                    <span className="text-sm text-gray-700">Manage Users</span>
                  </Link>
                  
                  <Link to="/admin/pending-files" className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 transition-colors">
                    <FaClipboardList className="text-rose-600 text-2xl mb-2" />
                    <span className="text-sm text-gray-700">Pending Files</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Recent Uploads Section */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Recently Added</h2>
              <Link to="/recent" className="text-indigo-600 text-sm hover:underline">View All</Link>
            </div>
            
            {recentItems.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center border border-gray-100">
                <p className="text-gray-500">No files have been uploaded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentItems.map((item) => (
                  <div
                    key={`${item.isFile ? 'file' : 'material'}-${item._id}`}
                    className="bg-white rounded-lg shadow-sm overflow-hidden transition-transform hover:translate-y-[-5px] hover:shadow-lg border border-gray-100"
                  >
                    <div className="relative bg-indigo-50 pt-8 pb-10 flex items-center justify-center">
                      <div className="absolute top-2 right-2">
                        <button 
                          onClick={() => handleToggleBookmark(item)}
                          className={`p-1.5 rounded-full ${getBookmarkButtonClass(item)} transition-colors bg-white/80`}
                          aria-label={(item.isFile && isFileBookmarked(item._id)) || 
                                      (item.isStudyMaterial && isStudyMaterialBookmarked(item._id)) 
                                      ? "Remove from saved" : "Save for later"}
                        >
                          <FaBookmark />
                        </button>
                      </div>
                      <div className="absolute top-2 left-2">
                        <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded-md">
                          {getItemTypeName(item)}
                        </span>
                      </div>
                      <div className="relative">
                        <FaFilePdf className="text-red-500 text-6xl" />
                        <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs py-0.5 text-center">
                          {item.fileType?.toUpperCase() || 'PDF'}
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2 truncate">{item.title}</h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          {item.branch || ''} {item.branch && item.year ? '•' : ''} {item.year || ''}
                        </div>
                        
                        <button
                          onClick={() => handleDownload(item)}
                          className="flex items-center gap-1 text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                          <FaDownload className="text-xs" /> Download
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        // Landing page view for non-logged in users
        <div className="py-12">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Access Study Materials for Your College
            </h2>
            <p className="mt-4 text-xl text-gray-500">
              College Katta provides students with a comprehensive repository of study materials, 
              including lecture notes, lab manuals, and previous year question papers.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                to="/login"
                className="px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-3 md:text-lg md:px-6"
              >
                Sign in to access
              </Link>
              <Link
                to="/register"
                className="ml-4 px-4 py-2 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white border-indigo-600 hover:bg-indigo-50 md:py-3 md:text-lg md:px-6"
              >
                Create an account
              </Link>
            </div>
          </div>
          
          <div className="mt-16">
            <div className="max-w-3xl mx-auto grid gap-8 grid-cols-1 md:grid-cols-3">
              <div className="bg-white shadow-sm rounded-lg px-6 py-8 border border-gray-100">
                <div className="text-indigo-600 mb-4">
                  <FaBook className="text-4xl" />
                </div>
                <h3 className="text-xl font-medium text-gray-900">Lecture Notes</h3>
                <p className="mt-2 text-gray-500">
                  Comprehensive notes from lectures, organized by subject and topic.
                </p>
              </div>
              
              <div className="bg-white shadow-sm rounded-lg px-6 py-8 border border-gray-100">
                <div className="text-indigo-600 mb-4">
                  <FaClipboardList className="text-4xl" />
                </div>
                <h3 className="text-xl font-medium text-gray-900">Previous Year Papers</h3>
                <p className="mt-2 text-gray-500">
                  Access previous year question papers to better prepare for exams.
                </p>
              </div>
              
              <div className="bg-white shadow-sm rounded-lg px-6 py-8 border border-gray-100">
                <div className="text-indigo-600 mb-4">
                  <FaFlask className="text-4xl" />
                </div>
                <h3 className="text-xl font-medium text-gray-900">Lab Manuals</h3>
                <p className="mt-2 text-gray-500">
                  Step-by-step guides for laboratory experiments and assignments.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home; 