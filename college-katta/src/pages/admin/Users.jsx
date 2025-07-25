import React, { useState, useEffect } from 'react';
import { FaUserShield, FaTimes, FaSearch, FaUserSlash, FaUserCheck, FaTrash, FaInfoCircle, FaBuilding, FaGraduationCap } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { formatDate, formatYearToText } from '../../utils/formatUtils';

const Users = () => {
  const { getAllUsers, promoteToAdmin, suspendUser, reactivateUser, removeUser, currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmAction, setConfirmAction] = useState(null);
  const [userDetailModal, setUserDetailModal] = useState(null);
  
  const usersPerPage = 10;
  
  // List of branches for validation and display
  const branches = [
    'Computer Science',
    'Computer Engineering',
    'Information Technology',
    'AI & DS',
    'Electronics',
    'Electrical',
    'Mechanical',
    'Civil',
    'Chemical',
    'Other'
  ];
  
  useEffect(() => {
    fetchUsers();
  }, [currentPage, roleFilter, statusFilter]);
  
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const allUsers = getAllUsers() || [];
      let filtered = [...allUsers];
      
      // Apply role filter
      if (roleFilter !== 'all') {
        filtered = filtered.filter(user => 
          roleFilter === 'admin' ? user.isAdmin : !user.isAdmin
        );
      }
      
      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(user => 
          user.status === statusFilter
        );
      }
      
      // Apply search term
      if (searchTerm) {
        filtered = filtered.filter(user => 
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Calculate total pages
      const total = Math.ceil(filtered.length / usersPerPage);
      setTotalPages(total);
      
      // Apply pagination
      const startIndex = (currentPage - 1) * usersPerPage;
      const endIndex = startIndex + usersPerPage;
      setUsers(allUsers);
      setFilteredUsers(filtered.slice(startIndex, endIndex));
      setLoading(false);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please refresh and try again.');
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user => 
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);
  
  const handlePromoteToAdmin = async (userId) => {
    try {
      setLoading(true);
      
      // Don't allow promoting current user
      if (userId === currentUser._id) {
        setError("You cannot change your own role.");
        setLoading(false);
        return;
      }
      
      // Confirm before promotion
      if (!window.confirm(`Are you sure you want to promote this user to admin? This will give them full access to all admin features.`)) {
        setLoading(false);
        return;
      }
      
      const result = await promoteToAdmin(userId);
      
      if (result.success) {
        // Update the local users state to reflect the change
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user._id === userId ? { ...user, isAdmin: true } : user
          )
        );
        
        // Update filtered users
        setFilteredUsers(prevUsers => 
          prevUsers.map(user => 
            user._id === userId ? { ...user, isAdmin: true } : user
          )
        );
        
        // Refetch users to ensure data is up to date
        fetchUsers();
      } else {
        setError(result.message || 'Failed to promote user to admin.');
      }
    } catch (err) {
      console.error('Error promoting user:', err);
      setError('Failed to promote user. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSuspendUser = async (userId) => {
    try {
      setLoading(true);
      
      // Don't allow suspending yourself
      if (userId === currentUser._id) {
        setError("You cannot suspend your own account.");
        setLoading(false);
        return;
      }
      
      // Don't allow suspending main admin
      if (userId === 'admin') {
        setError("You cannot suspend the main administrator account.");
        setLoading(false);
        return;
      }
      
      // Confirm before suspension
      if (!window.confirm(`Are you sure you want to suspend this user? They will no longer be able to log in.`)) {
        setLoading(false);
        return;
      }
      
      const result = await suspendUser(userId);
      
      if (result.success) {
        // Update the local users state to reflect the change
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user._id === userId ? { ...user, status: 'suspended' } : user
          )
        );
        
        // Update filtered users
        setFilteredUsers(prevUsers => 
          prevUsers.map(user => 
            user._id === userId ? { ...user, status: 'suspended' } : user
          )
        );
        
        // Refetch users to ensure data is up to date
        fetchUsers();
      } else {
        setError(result.message || 'Failed to suspend user.');
      }
    } catch (err) {
      console.error('Error suspending user:', err);
      setError('Failed to suspend user. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleReactivateUser = async (userId) => {
    try {
      setLoading(true);
      
      const result = await reactivateUser(userId);
      
      if (result.success) {
        // Update the local users state to reflect the change
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user._id === userId ? { ...user, status: 'active' } : user
          )
        );
        
        // Update filtered users
        setFilteredUsers(prevUsers => 
          prevUsers.map(user => 
            user._id === userId ? { ...user, status: 'active' } : user
          )
        );
        
        // Refetch users to ensure data is up to date
        fetchUsers();
      } else {
        setError(result.message || 'Failed to reactivate user.');
      }
    } catch (err) {
      console.error('Error reactivating user:', err);
      setError('Failed to reactivate user. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRemoveUser = async (userEmail) => {
    try {
      // Don't allow removing yourself
      if (userEmail === currentUser.email) {
        alert("You cannot remove your own account.");
        return;
      }
      
      // Open confirmation dialog
      setConfirmAction({
        type: 'remove',
        userEmail,
        message: `Are you sure you want to permanently remove ${userEmail}? This action cannot be undone.`
      });
    } catch (err) {
      console.error('Error preparing user removal:', err);
    }
  };
  
  const confirmActionHandler = () => {
    if (!confirmAction) return;
    
    const { type, userEmail } = confirmAction;
    let result;
    
    switch (type) {
      case 'promote':
        result = promoteToAdmin(userEmail);
        if (result.success) {
          alert('User successfully promoted to admin');
        } else {
          alert(`Failed to promote user: ${result.message}`);
        }
        break;
        
      case 'suspend':
        result = suspendUser(userEmail);
        if (result.success) {
          alert('User successfully suspended');
        } else {
          alert(`Failed to suspend user: ${result.message}`);
        }
        break;
        
      case 'remove':
        result = removeUser(userEmail);
        if (result.success) {
          alert('User successfully removed');
        } else {
          alert(`Failed to remove user: ${result.message}`);
        }
        break;
        
      default:
        break;
    }
    
    // Close confirmation dialog and refresh users
    setConfirmAction(null);
    fetchUsers();
  };
  
  const cancelActionHandler = () => {
    setConfirmAction(null);
  };
  
  const handleViewDetails = (user) => {
    setUserDetailModal(user);
  };
  
  const closeUserDetails = () => {
    setUserDetailModal(null);
  };
  
  const getBranchDisplay = (branch) => {
    return branches.includes(branch) ? branch : 'Other';
  };
  
  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
        <p className="text-gray-600">View and manage all users</p>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <div>
              <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                id="role-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              >
                <option value="all">All Roles</option>
                <option value="user">Users</option>
                <option value="admin">Admins</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
          
          <div className="relative max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-md py-2 pl-10 pr-4 block w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            />
          </div>
        </div>
      </div>
      
      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Joined
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.email} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.fullName} className="h-10 w-10 rounded-full" />
                          ) : (
                            <span className="text-blue-800 font-medium text-sm">
                              {user.fullName.split(' ').map(n => n[0]).join('')}
                            </span>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${user.isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                        {user.isAdmin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.lastLogin)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => handleViewDetails(user)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                          title="View Details"
                        >
                          <FaInfoCircle className="w-4 h-4" />
                        </button>
                        
                        {!user.isAdmin && (
                          <button
                            onClick={() => handlePromoteToAdmin(user._id)}
                            className="text-indigo-600 hover:text-indigo-900 flex items-center"
                            title="Promote to Admin"
                          >
                            <FaUserShield className="w-4 h-4" />
                          </button>
                        )}
                        
                        {user.status === 'active' ? (
                          <button
                            onClick={() => handleSuspendUser(user._id)}
                            className="text-red-600 hover:text-red-900 flex items-center"
                            title="Suspend User"
                          >
                            <FaUserSlash className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivateUser(user._id)}
                            className="text-green-600 hover:text-green-900 flex items-center"
                            title="Reactivate User"
                          >
                            <FaUserCheck className="w-4 h-4" />
                          </button>
                        )}
                        
                        {/* Remove user button - don't show for main admin */}
                        {user.email !== 'admin@collegekata.com' && (
                          <button
                            onClick={() => handleRemoveUser(user.email)}
                            className="text-gray-600 hover:text-gray-900 flex items-center"
                            title="Remove User"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
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
      </div>
      
      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Action</h3>
            <p className="text-gray-700 mb-6">{confirmAction.message}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelActionHandler}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmActionHandler}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* User Details Modal */}
      {userDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
              <button 
                onClick={closeUserDetails}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="flex items-center mb-6">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-blue-800 font-medium text-xl">
                  {userDetailModal.fullName.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h4 className="text-xl font-medium text-gray-900">{userDetailModal.fullName}</h4>
                <p className="text-gray-600">{userDetailModal.email}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="flex items-center mb-2">
                  <FaBuilding className="text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Branch/Major:</span>
                </div>
                <p className="text-gray-900 ml-6">
                  {getBranchDisplay(userDetailModal.branch) || 'Not specified'}
                </p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="flex items-center mb-2">
                  <FaGraduationCap className="text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Year of Study:</span>
                </div>
                <p className="text-gray-900 ml-6">
                  {formatYearToText(userDetailModal.year) || 'Not specified'}
                </p>
              </div>
              
              {userDetailModal.college && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center mb-2">
                    <FaBuilding className="text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-gray-700">College/University:</span>
                  </div>
                  <p className="text-gray-900 ml-6">
                    {userDetailModal.college}
                  </p>
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <div className="flex flex-wrap justify-between text-sm text-gray-500">
                <div className="mb-2">
                  <span className="font-medium">Joined:</span> {formatDate(userDetailModal.createdAt)}
                </div>
                <div className="mb-2">
                  <span className="font-medium">Last Login:</span> {formatDate(userDetailModal.lastLogin) || 'Never'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users; 