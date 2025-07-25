import React, { useState, useEffect } from 'react';
import { FaSearch, FaFileAlt, FaFilePdf, FaFileImage, FaFileWord, FaFileArchive, FaFileExcel, FaFilePowerpoint, FaTimes, FaTrash, FaClock, FaCheck, FaExclamationTriangle, FaFolder } from 'react-icons/fa';
import { useFileContext } from '../context/FileContext';
import { useAuth } from '../context/AuthContext';

const MyUploads = () => {
  const { currentUser } = useAuth();
  const { searchFiles, removeUserFile, myUploads: contextUploads, loading: contextLoading } = useFileContext();
  const [myUploads, setMyUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  useEffect(() => {
    // Set loading state while waiting for context
    setLoading(contextLoading);
    
    // When contextUploads changes, update our local state
    if (contextUploads) {
      console.log('MyUploads: Processing', contextUploads.length, 'files from context');
      try {
        // Apply only search term, without filters
        if (searchTerm) {
          const filtered = searchFiles(searchTerm, {}, contextUploads);
          setMyUploads(filtered);
        } else {
          setMyUploads(contextUploads);
        }
        setErrorMessage('');
      } catch (error) {
        console.error('Error processing uploads:', error);
        setErrorMessage('Failed to load your uploads. Please try again.');
      }
      setLoading(false);
    }
  }, [contextUploads, searchTerm, contextLoading, searchFiles]);
  
  const handleSearch = (e) => {
    e.preventDefault();
    
    if (!contextUploads || contextUploads.length === 0) {
      setMyUploads([]);
      return;
    }
    
    console.log('Searching uploads with term:', searchTerm);
    
    // Use searchFiles function with empty filters
    const filteredUploads = searchFiles(searchTerm, {}, contextUploads);
    setMyUploads(filteredUploads);
  };
  
  const clearSearch = () => {
    setSearchTerm('');
    setMyUploads(contextUploads);
  };
  
  const deleteFile = async (fileId) => {
    const fileToDelete = myUploads.find(file => file._id === fileId);
    if (!fileToDelete) return;
    
    let confirmMessage;
    
    if (fileToDelete.isPersonalFile || fileToDelete.status === 'personal_file') {
      confirmMessage = 'Are you sure you want to remove this personal file from your uploads? Note that this will not delete the file from your Personal Files section.';
    } else if (fileToDelete.status === 'approved') {
      confirmMessage = 'Are you sure you want to remove this file from your uploads? The file will still be available in the study materials for other users.';
    } else {
      confirmMessage = 'Are you sure you want to remove this file from your uploads? This will also remove it from pending review.';
    }
      
    if (window.confirm(confirmMessage)) {
      try {
        // For personal files, we just remove from the UI without API call
        if (fileToDelete.isPersonalFile || fileToDelete.status === 'personal_file') {
          // Filter out the personal file from myUploads
          setMyUploads(prevUploads => prevUploads.filter(file => file._id !== fileId));
          
          setSuccessMessage('Personal file removed from your uploads list');
          setTimeout(() => {
            setSuccessMessage('');
          }, 3000);
          return;
        }
        
        // For regular files, call the removeUserFile function from context
        const success = await removeUserFile(fileId);
        
        if (success) {
          // Success message will be shown by the UI update from context
          setSuccessMessage(fileToDelete.status === 'approved'
            ? 'File removed from your uploads but still available in study materials'
            : 'File removed from your uploads and pending review'
          );
          
          // Clear message after 3 seconds
          setTimeout(() => {
            setSuccessMessage('');
          }, 3000);
        }
      } catch (error) {
        console.error('Error deleting file:', error);
        setSuccessMessage('Error removing file. Please try again.');
      }
    }
  };
  
  // Function to get the appropriate icon based on file type
  const getFileIcon = (fileType) => {
    switch(fileType?.toLowerCase()) {
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
  
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get status badge based on file status
  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <FaCheck className="mr-1" /> Approved
        </span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <FaClock className="mr-1" /> Pending
        </span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 font-bold">
          <FaExclamationTriangle className="mr-1" /> Rejected
        </span>;
      case 'personal_file':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <FaFolder className="mr-1" /> Personal File
        </span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Unknown
        </span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">My Uploads</h1>
          
          {/* Success message */}
          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded mb-4 w-full md:w-auto animate-fadeIn">
              <span className="inline-flex items-center">
                <FaCheck className="mr-2" /> {successMessage}
              </span>
            </div>
          )}
          
          {/* Error message */}
          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 w-full md:w-auto animate-fadeIn">
              <span className="inline-flex items-center">
                <FaTimes className="mr-2" /> {errorMessage}
              </span>
            </div>
          )}
          
          <div className="flex w-full md:w-auto">
            <form onSubmit={handleSearch} className="flex-1 md:flex-initial">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search uploads..."
                  className="w-full md:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-gray-400" />
                </div>
              </div>
            </form>
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="ml-2 flex items-center bg-white text-blue-700 border border-gray-300 rounded-md px-4 py-2 hover:bg-blue-50 transition-colors"
              >
                <FaTimes className="mr-2" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Files List */}
        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : myUploads.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-lg border border-gray-200">
              <FaFileAlt className="text-gray-400 text-5xl mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-700 mb-2">No uploads found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? "No uploads match your search criteria."
                  : "You haven't uploaded any files yet."}
              </p>
              <button 
                onClick={() => document.querySelector('[aria-label="Upload file"]')?.click()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Upload your first file
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {myUploads.map((file) => (
                    <tr key={file._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center">
                            {getFileIcon(file.fileType)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{file.title}</div>
                            <div className="text-sm text-gray-500">{file.fileType?.toUpperCase() || 'FILE'} • {file.fileSize || '?'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {file.isPersonalFile || file.status === 'personal_file' ? (
                          <>
                            <div className="text-sm font-medium text-gray-900">{file.subject || 'No Subject'}</div>
                            <div className="text-sm text-gray-500">{file.type || 'Notes'}</div>
                            <div className="text-xs text-gray-400 mt-1">Uploaded on {formatDate(file.createdAt)}</div>
                          </>
                        ) : (
                          <>
                            <div className="text-sm text-gray-900">{file.branch} • {file.year}</div>
                            <div className="text-sm text-gray-500">{file.subject} • {file.type}</div>
                            <div className="text-xs text-gray-400 mt-1">Uploaded on {formatDate(file.createdAt)}</div>
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-col space-y-2">
                          {getStatusBadge(file.status)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex justify-center">
                          <button 
                            onClick={() => deleteFile(file._id)} 
                            className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50"
                            title="Remove file from your uploads"
                          >
                            <FaTrash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyUploads; 