import React, { useState } from 'react';
import { FaCheck, FaTimes, FaEye, FaDownload, FaSpinner } from 'react-icons/fa';
import { useStudyMaterial } from '../context/StudyMaterialContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminStudyMaterials = () => {
  const { pendingMaterials, approveMaterial, rejectMaterial, downloadMaterial, loading } = useStudyMaterial();
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [viewMaterial, setViewMaterial] = useState(null);
  const [actionLoading, setActionLoading] = useState({
    approve: null,
    reject: null,
    download: null
  });
  
  // Check if user is admin and redirect if not
  React.useEffect(() => {
    if (!loading && (!currentUser || !isAdmin())) {
      navigate('/login');
    }
  }, [currentUser, isAdmin, loading, navigate]);
  
  // Handle approve action
  const handleApprove = async (id) => {
    setActionLoading(prev => ({ ...prev, approve: id }));
    try {
      await approveMaterial(id);
    } catch (error) {
      console.error('Error approving material:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, approve: null }));
    }
  };
  
  // Handle reject action
  const handleReject = async (id) => {
    if (window.confirm('Are you sure you want to reject this material? This action cannot be undone.')) {
      setActionLoading(prev => ({ ...prev, reject: id }));
      try {
        await rejectMaterial(id);
      } catch (error) {
        console.error('Error rejecting material:', error);
      } finally {
        setActionLoading(prev => ({ ...prev, reject: null }));
      }
    }
  };
  
  // Handle download action
  const handleDownload = async (id) => {
    setActionLoading(prev => ({ ...prev, download: id }));
    try {
      await downloadMaterial(id);
    } catch (error) {
      console.error('Error downloading material:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, download: null }));
    }
  };
  
  // Display material details modal
  const openMaterialDetails = (material) => {
    setViewMaterial(material);
  };
  
  // Close material details modal
  const closeMaterialDetails = () => {
    setViewMaterial(null);
  };

  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Render tag pills
  const renderTags = (tags) => {
    if (!tags || tags.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {tags.map((tag, index) => (
          <span key={index} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
            {tag}
          </span>
        ))}
      </div>
    );
  };
  
  // If loading or not admin, show loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <FaSpinner className="animate-spin text-4xl text-blue-500 mx-auto" />
        <p className="mt-4 text-gray-600">Loading materials...</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Manage Study Materials</h1>
        <p className="text-gray-600 mt-2">Review and approve pending study materials</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700">Pending Materials</h2>
          <p className="text-sm text-gray-500">Review and approve these materials to make them available to students</p>
        </div>
        
        {pendingMaterials.length === 0 ? (
          <div className="py-16 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No pending materials</h3>
            <p className="mt-1 text-gray-500">All materials have been reviewed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Material
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitter
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted On
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingMaterials.map((material) => (
                  <tr key={material._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-500">
                          {material.fileType === 'pdf' ? (
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          ) : material.fileType === 'doc' || material.fileType === 'docx' ? (
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2H5v-2h10zm0-3v2H5v-2h10z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a3 3 0 006 0V7a1 1 0 112 0v4a5 5 0 01-10 0V7a5 5 0 1110 0v2a1 1 0 11-2 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{material.title}</div>
                          <div className="text-sm text-gray-500">{material.fileName} • {material.fileSize}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{material.subject}</div>
                      <div className="text-sm text-gray-500">
                        {material.branch} • {material.year} • {material.materialType}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{material.uploadedBy?.name || 'Unknown User'}</div>
                      <div className="text-sm text-gray-500">{material.uploadedBy?.email || 'No email'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(material.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openMaterialDetails(material)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => handleDownload(material._id)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          disabled={actionLoading.download === material._id}
                          title="Download"
                        >
                          {actionLoading.download === material._id ? (
                            <FaSpinner className="animate-spin" />
                          ) : (
                            <FaDownload />
                          )}
                        </button>
                        <button
                          onClick={() => handleApprove(material._id)}
                          className="text-green-600 hover:text-green-900 p-1"
                          disabled={actionLoading.approve === material._id}
                          title="Approve"
                        >
                          {actionLoading.approve === material._id ? (
                            <FaSpinner className="animate-spin" />
                          ) : (
                            <FaCheck />
                          )}
                        </button>
                        <button
                          onClick={() => handleReject(material._id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          disabled={actionLoading.reject === material._id}
                          title="Reject"
                        >
                          {actionLoading.reject === material._id ? (
                            <FaSpinner className="animate-spin" />
                          ) : (
                            <FaTimes />
                          )}
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
      
      {/* Material Details Modal */}
      {viewMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center bg-gray-50 sticky top-0">
              <h3 className="text-xl font-semibold text-gray-800">Material Details</h3>
              <button 
                onClick={closeMaterialDetails}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{viewMaterial.title}</h2>
                {viewMaterial.description && (
                  <p className="text-gray-600 mb-4">{viewMaterial.description}</p>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Material Details</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-500">Type</div>
                          <div className="font-medium">{viewMaterial.materialType}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Course Code</div>
                          <div className="font-medium">{viewMaterial.courseCode || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Branch</div>
                          <div className="font-medium">{viewMaterial.branch}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Year</div>
                          <div className="font-medium">{viewMaterial.year}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Semester</div>
                          <div className="font-medium">{viewMaterial.semester || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Subject</div>
                          <div className="font-medium">{viewMaterial.subject}</div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="text-xs text-gray-500">Tags</div>
                        {renderTags(viewMaterial.tags)}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">File Information</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 flex items-center justify-center bg-blue-100 rounded-lg text-blue-500 mr-3">
                          {viewMaterial.fileType === 'pdf' ? (
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          ) : viewMaterial.fileType === 'doc' || viewMaterial.fileType === 'docx' ? (
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2H5v-2h10zm0-3v2H5v-2h10z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a3 3 0 006 0V7a1 1 0 112 0v4a5 5 0 01-10 0V7a5 5 0 1110 0v2a1 1 0 11-2 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{viewMaterial.fileName}</div>
                          <div className="text-sm text-gray-500">{viewMaterial.fileSize}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-500">Type</div>
                          <div className="font-medium capitalize">{viewMaterial.fileType}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Uploaded On</div>
                          <div className="font-medium">{formatDate(viewMaterial.createdAt)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Uploaded By</div>
                          <div className="font-medium">{viewMaterial.uploadedBy?.name || 'Unknown User'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Status</div>
                          <div className="font-medium">
                            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-md">
                              Pending Review
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDownload(viewMaterial._id)}
                        className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        disabled={actionLoading.download === viewMaterial._id}
                      >
                        {actionLoading.download === viewMaterial._id ? (
                          <>
                            <FaSpinner className="animate-spin mr-2" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <FaDownload className="mr-2" />
                            Download File
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-6 flex justify-between">
                <button
                  onClick={() => {
                    handleReject(viewMaterial._id);
                    closeMaterialDetails();
                  }}
                  className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  disabled={actionLoading.reject === viewMaterial._id}
                >
                  {actionLoading.reject === viewMaterial._id ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <FaTimes className="mr-2" />
                      Reject Material
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    handleApprove(viewMaterial._id);
                    closeMaterialDetails();
                  }}
                  className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  disabled={actionLoading.approve === viewMaterial._id}
                >
                  {actionLoading.approve === viewMaterial._id ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <FaCheck className="mr-2" />
                      Approve Material
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudyMaterials; 