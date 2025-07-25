import { useState, useEffect } from 'react';
import { FaUsers, FaFilePdf, FaCheck, FaClock, FaDownload, FaTimes, FaUserShield, FaFileUpload } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { formatDate, formatYearToText } from '../../utils/formatUtils';

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalFiles: 0,
    pendingFiles: 0,
    approvedFiles: 0,
    totalDownloads: 0
  });
  const [recentPendingFiles, setRecentPendingFiles] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // In a real app, these would be separate API calls
        // For demo, we'll use mock data
        
        // Mock stats
        setStats({
          totalUsers: 45,
          totalFiles: 120,
          pendingFiles: 8,
          approvedFiles: 112,
          totalDownloads: 568
        });
        
        // Fetch pending files
        const pendingFilesResponse = await axios.get('/files/pending');
        setRecentPendingFiles(pendingFilesResponse.data.files.slice(0, 5));
        
        // Fetch recent users (in a real app)
        const usersResponse = await axios.get('/users?limit=5');
        setRecentUsers(usersResponse.data.users);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching admin stats:', err);
        setError('Failed to load admin dashboard data');
        setLoading(false);
        
        // Mock data for demo purposes
        setRecentPendingFiles([
          { 
            _id: '1', 
            title: 'Database Systems Notes', 
            branch: 'Computer Science',
            type: 'Notes',
            createdAt: '2023-05-15T10:30:00Z',
            uploadedBy: { name: 'John Doe', email: 'john@example.com' }
          },
          { 
            _id: '2', 
            title: 'Operating Systems Study Guide', 
            branch: 'Information Technology',
            type: 'Notes',
            createdAt: '2023-05-14T14:15:00Z',
            uploadedBy: { name: 'Jane Smith', email: 'jane@example.com' }
          },
          { 
            _id: '3', 
            title: 'Data Structures Question Paper', 
            branch: 'Computer Science',
            type: 'Question Paper',
            createdAt: '2023-05-13T09:45:00Z',
            uploadedBy: { name: 'Mike Johnson', email: 'mike@example.com' }
          },
        ]);
        
        setRecentUsers([
          { _id: '1', name: 'Jane Smith', email: 'jane@example.com', role: 'user', createdAt: '2023-05-12T12:30:00Z' },
          { _id: '2', name: 'Mike Johnson', email: 'mike@example.com', role: 'user', createdAt: '2023-05-11T10:15:00Z' },
          { _id: '3', name: 'Sarah Williams', email: 'sarah@example.com', role: 'user', createdAt: '2023-05-10T16:45:00Z' },
          { _id: '4', name: 'David Brown', email: 'david@example.com', role: 'user', createdAt: '2023-05-09T09:20:00Z' },
          { _id: '5', name: 'Lisa Davis', email: 'lisa@example.com', role: 'user', createdAt: '2023-05-08T14:10:00Z' },
        ]);
      }
    };
    
    fetchStats();
  }, []);
  
  const handleApprove = async (fileId) => {
    try {
      await axios.patch(`/files/${fileId}/status`, { status: 'approved' });
      // Remove from pending list
      setRecentPendingFiles(recentPendingFiles.filter(file => file._id !== fileId));
      // Update counts
      setStats(prev => ({
        ...prev,
        pendingFiles: prev.pendingFiles - 1,
        approvedFiles: prev.approvedFiles + 1
      }));
    } catch (err) {
      console.error('Error approving file:', err);
      alert('Failed to approve file');
    }
  };
  
  const handleReject = async (fileId) => {
    try {
      await axios.patch(`/files/${fileId}/status`, { status: 'rejected' });
      // Remove from pending list
      setRecentPendingFiles(recentPendingFiles.filter(file => file._id !== fileId));
      // Update count
      setStats(prev => ({
        ...prev,
        pendingFiles: prev.pendingFiles - 1
      }));
    } catch (err) {
      console.error('Error rejecting file:', err);
      alert('Failed to reject file');
    }
  };
  
  const handlePromoteToAdmin = async (userId) => {
    try {
      await axios.patch(`/users/${userId}/role`, { role: 'admin' });
      // Update user in list
      setRecentUsers(
        recentUsers.map(user => 
          user._id === userId ? { ...user, role: 'admin' } : user
        )
      );
    } catch (err) {
      console.error('Error promoting user:', err);
      alert('Failed to promote user to admin');
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-600">Welcome back, {currentUser?.fullName || 'Administrator'}!</p>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 flex items-center">
          <div className="rounded-full bg-amber-100 p-3 mr-4">
            <FaUsers className="text-amber-600 text-xl" />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Total Users</p>
            <p className="text-2xl font-bold text-gray-800">{stats.totalUsers}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 flex items-center">
          <div className="rounded-full bg-rose-100 p-3 mr-4">
            <FaFileUpload className="text-rose-600 text-xl" />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Pending Files</p>
            <p className="text-2xl font-bold text-gray-800">{stats.pendingFiles}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 flex items-center">
          <div className="rounded-full bg-purple-100 p-3 mr-4">
            <FaCheck className="text-purple-600 text-xl" />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Approved Files</p>
            <p className="text-2xl font-bold text-gray-800">{stats.approvedFiles}</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Files */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Pending Approvals</h2>
            <Link to="/admin/pending-files" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All
            </Link>
          </div>
          
          {recentPendingFiles.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-gray-500">No pending files to approve!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentPendingFiles.map(file => (
                <div key={file._id} className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <div className="mb-2 sm:mb-0">
                      <h3 className="font-medium text-gray-800">{file.title}</h3>
                      <p className="text-sm text-gray-500">
                        {file.branch} • {file.type} • Uploaded by {file.uploadedBy.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(file.createdAt)}
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApprove(file._id)}
                        className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(file._id)}
                        className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Recent Users */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Recent Users</h2>
            <Link to="/admin/users" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All
            </Link>
          </div>
          
          <div className="space-y-4">
            {recentUsers.map(user => (
              <div key={user._id} className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                  <div className="mb-2 sm:mb-0">
                    <h3 className="font-medium text-gray-800">{user.fullName}</h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <div className="flex items-center mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        Joined {formatDate(user.createdAt)}
                      </span>
                    </div>
                  </div>
                  
                  {user.role !== 'admin' && (
                    <button
                      onClick={() => handlePromoteToAdmin(user._id)}
                      className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm flex items-center"
                    >
                      <FaUserShield className="mr-1" /> Promote to Admin
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 