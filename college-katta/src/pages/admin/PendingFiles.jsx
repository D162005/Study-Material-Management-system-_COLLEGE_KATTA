import { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaSearch, FaFilePdf, FaFilter, FaDownload, FaEye, FaFileWord } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useFileContext } from '../../context/FileContext';
import { useAuth } from '../../context/AuthContext';

const PendingFiles = () => {
  const { pendingFiles, approveFile, rejectFile, downloadFile } = useFileContext();
  const { currentUser, isAdmin } = useAuth();
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    branch: 'all',
    type: 'all',
    dateRange: 'all',
  });

  const filesPerPage = 10;
  
  useEffect(() => {
    // Check if user is admin
    if (!currentUser || !isAdmin()) {
      setError('You do not have permission to access this page');
      return;
    }
    
    setLoading(false);
  }, [currentUser, isAdmin]);
  
  useEffect(() => {
    // Apply search and filters to pendingFiles
    let filtered = [...pendingFiles];
    
    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(file => 
        file.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.uploadedBy.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply branch filter
    if (filters.branch !== 'all') {
      filtered = filtered.filter(file => file.branch === filters.branch);
    }
    
    // Apply type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(file => file.type === filters.type);
    }
    
    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          cutoff.setDate(now.getDate() - 1);
          break;
        case 'week':
          cutoff.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoff.setMonth(now.getMonth() - 1);
          break;
        default:
          break;
      }
      
      filtered = filtered.filter(file => new Date(file.createdAt) >= cutoff);
    }
    
    // Calculate total pages
    setTotalPages(Math.ceil(filtered.length / filesPerPage));
    
    // Apply pagination
    const start = (currentPage - 1) * filesPerPage;
    const end = start + filesPerPage;
    setFilteredFiles(filtered.slice(start, end));
    
  }, [pendingFiles, searchTerm, filters, currentPage]);
  
  const resetFilters = () => {
    setFilters({
      branch: 'all',
      type: 'all',
      dateRange: 'all',
    });
    setSearchTerm('');
  };
  
  const handleApprove = async (fileId) => {
    try {
      setLoading(true);
      
      // Ask for confirmation
      if (!window.confirm('Are you sure you want to approve this file? It will be visible to all users.')) {
        setLoading(false);
        return;
      }
      
      console.log('Approving file:', fileId);
      const result = await approveFile(fileId);
      
      if (result) {
        // Success notification - could be replaced with a toast
        setFilteredFiles(prev => prev.filter(file => file._id !== fileId));
        // Update total pages
        const newTotalPages = Math.ceil((filteredFiles.length - 1) / filesPerPage);
        setTotalPages(newTotalPages);
        // If we're on a page that no longer exists, go to the last page
        if (currentPage > newTotalPages && newTotalPages > 0) {
          setCurrentPage(newTotalPages);
        }
        console.log('File approved successfully');
      } else {
        setError('Failed to approve file. Please try again.');
      }
    } catch (err) {
      console.error('Error approving file:', err);
      setError('An error occurred while approving the file. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleReject = async (fileId) => {
    try {
      setLoading(true);
      
      // Ask for confirmation
      if (!window.confirm('Are you sure you want to reject this file? It will not be visible to users.')) {
        setLoading(false);
        return;
      }
      
      console.log('Rejecting file:', fileId);
      const result = await rejectFile(fileId);
      
      if (result) {
        // Success notification - could be replaced with a toast
        setFilteredFiles(prev => prev.filter(file => file._id !== fileId));
        // Update total pages
        const newTotalPages = Math.ceil((filteredFiles.length - 1) / filesPerPage);
        setTotalPages(newTotalPages);
        // If we're on a page that no longer exists, go to the last page
        if (currentPage > newTotalPages && newTotalPages > 0) {
          setCurrentPage(newTotalPages);
        }
        console.log('File rejected successfully');
      } else {
        setError('Failed to reject file. Please try again.');
      }
    } catch (err) {
      console.error('Error rejecting file:', err);
      setError('An error occurred while rejecting the file. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const previewFile = (fileId) => {
    try {
      // Find the file in the pending files
      const file = pendingFiles.find(f => f._id === fileId);
      if (!file) {
        setError('File not found.');
        return;
      }
      
      // Create a simple preview dialog
      console.log('Previewing file:', file.title);
      
      // In a real implementation, this would open a modal with a preview
      // For now, we'll just show an alert with file details
      alert(`
File Preview:
--------------
Title: ${file.title}
Type: ${file.fileType.toUpperCase()}
Size: ${file.fileSize}
Uploaded by: ${file.uploadedBy?.username || file.uploadedBy || 'Unknown'}
Subject: ${file.subject}
Branch: ${file.branch}
Year: ${file.year}
Description: ${file.description || 'No description provided'}
      `);
    } catch (err) {
      console.error('Error previewing file:', err);
      setError('Failed to preview file.');
    }
  };
  
  const handleDownload = (fileId) => {
    try {
      console.log('Downloading file:', fileId);
      downloadFile(fileId)
        .then(success => {
          if (!success) {
            setError('Failed to download file. Please try again.');
          }
        })
        .catch(err => {
          console.error('Error downloading file:', err);
          setError('Failed to download file. Please try again.');
        });
    } catch (err) {
      console.error('Error initiating download:', err);
      setError('Failed to initiate download. Please try again.');
    }
  };
  
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'pdf':
        return <FaFilePdf className="text-red-600" />;
      case 'doc':
      case 'docx':
        return <FaFileWord className="text-blue-600" />;
      default:
        return <FaFilePdf className="text-gray-600" />;
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4">
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Pending Approvals</h1>
        <p className="text-gray-600">Review and approve uploaded materials</p>
      </div>
      
      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2 items-center">
            <h3 className="text-lg font-medium text-gray-800">Filters</h3>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-blue-600 hover:text-blue-800"
              title={showFilters ? "Hide filters" : "Show filters"}
            >
              <FaFilter />
            </button>
          </div>
          
          <div className="flex space-x-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border border-gray-300 rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              />
            </div>
            
            {(searchTerm || filters.branch !== 'all' || filters.type !== 'all' || filters.dateRange !== 'all') && (
              <button
                onClick={resetFilters}
                className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 text-sm"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
        
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <label htmlFor="branch-filter" className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select
                id="branch-filter"
                value={filters.branch}
                onChange={(e) => setFilters({...filters, branch: e.target.value})}
                className="border border-gray-300 rounded-md p-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              >
                <option value="all">All Branches</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Electronics">Electronics</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Civil">Civil</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                id="type-filter"
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
                className="border border-gray-300 rounded-md p-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              >
                <option value="all">All Types</option>
                <option value="Notes">Notes</option>
                <option value="Question Paper">Question Paper</option>
                <option value="Reference Book">Reference Book</option>
                <option value="Project Report">Project Report</option>
                <option value="Lab Manual">Lab Manual</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">Upload Date</label>
              <select
                id="date-filter"
                value={filters.dateRange}
                onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                className="border border-gray-300 rounded-md p-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              >
                <option value="all">All Time</option>
                <option value="today">Last 24 Hours</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
              </select>
            </div>
          </div>
        )}
      </div>
      
      {/* Files List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-16 w-16 text-gray-400">
              <FaFilePdf size={64} />
            </div>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No pending files found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filters.branch !== 'all' || filters.type !== 'all' || filters.dateRange !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'There are no files waiting for approval at this time'}
            </p>
            {(searchTerm || filters.branch !== 'all' || filters.type !== 'all' || filters.dateRange !== 'all') && (
              <div className="mt-6">
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Details
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Branch & Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uploaded By
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Uploaded
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFiles.map(file => (
                    <tr key={file._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-md flex items-center justify-center">
                            {getFileIcon(file.fileType)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{file.title}</div>
                            <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">{file.description}</div>
                            <div className="text-xs text-gray-400 mt-1">{file.fileSize}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{file.branch}</div>
                        <div className="text-sm text-gray-500">{file.subject}</div>
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 mt-1">
                          {file.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {typeof file.uploadedBy === 'object' 
                            ? (file.uploadedBy?.username || file.uploadedBy?.email || 'Unknown')
                            : (file.uploadedBy || 'Unknown')}
                        </div>
                        {file.uploadedBy?.fullName && (
                          <div className="text-xs text-gray-500">{file.uploadedBy.fullName}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(file.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => previewFile(file._id)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Preview"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => handleDownload(file._id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Download"
                          >
                            <FaDownload />
                          </button>
                          <button
                            onClick={() => handleApprove(file._id)}
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <FaCheck />
                          </button>
                          <button
                            onClick={() => handleReject(file._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Reject"
                          >
                            <FaTimes />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing page <span className="font-medium">{currentPage}</span> of{' '}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 border rounded-md text-sm ${
                      currentPage === 1
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 border rounded-md text-sm ${
                      currentPage === totalPages
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PendingFiles; 