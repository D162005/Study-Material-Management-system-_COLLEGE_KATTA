import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { formatYearToText } from '../utils/formatUtils';

const API_URL = 'http://localhost:5002/api';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Check if user is already logged in
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Check for token in localStorage
        const token = localStorage.getItem('token');
        
        if (token) {
          // Set up axios default header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verify token with server
          const response = await axios.get(`${API_URL}/auth/me`);
          
          // Debug server response
          console.log('Auth check response:', response.data);
          
          // Set current user with the correct data structure
          if (response.data && response.data.user) {
            setCurrentUser(response.data.user);
        
            // Load all users for admin management if user is admin
            if (response.data.user.isAdmin) {
        loadAllUsers();
            }
          } else {
            // If response doesn't have expected structure, clear auth
            console.error('Invalid user data structure in response:', response.data);
            localStorage.removeItem('token');
            axios.defaults.headers.common['Authorization'] = '';
          }
        }
      } catch (err) {
        console.log('User not authenticated or token expired:', err);
        // Clear invalid token
        localStorage.removeItem('token');
        axios.defaults.headers.common['Authorization'] = '';
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);
  
  // Load all users from API (admin only)
  const loadAllUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`);
      setAllUsers(response.data.users || response.data);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };
  
  // Register a new user
  const register = async (userData) => {
    try {
      setError(null);
      setLoading(true);
      
      // Ensure data matches the expected API format
      const registerData = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        fullName: userData.fullName,
        branch: userData.branch,
        year: userData.year
      };
      
      console.log('Sending registration data:', registerData);
      const response = await axios.post(`${API_URL}/auth/register`, registerData);
      
      // Store the token
      localStorage.setItem('token', response.data.token);
      
      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      
      // Set current user
      setCurrentUser(response.data.user);
      
      return { success: true };
    } catch (err) {
      console.error('Registration error:', err);
      let errorMsg = 'Registration failed';
      
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMsg = err.response.data.message || 'Server error';
        console.error('Server response:', err.response.data);
      } else if (err.request) {
        // The request was made but no response was received
        errorMsg = 'No response from server. Please check your connection.';
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMsg = err.message || 'Registration failed';
      }
      
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  };
  
  // Login user
  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      
      // Make sure API_URL is correct
      console.log('Login attempt to:', `${API_URL}/auth/login`);
      
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      
      // Store the token
      localStorage.setItem('token', response.data.token);
      
      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      
      // Set current user
      setCurrentUser(response.data.user);
      console.log('Login successful:', response.data.user);
          
      // Load all users if admin
      if (response.data.user.isAdmin) {
        loadAllUsers();
      }
      
      return { 
        success: true, 
        isAdmin: response.data.user.isAdmin 
      };
    } catch (err) {
      console.error('Login error:', err);
      let errorMsg = 'Login failed';
      
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMsg = err.response.data.message || 'Server error';
        console.error('Server response:', err.response.data);
      } else if (err.request) {
        // The request was made but no response was received
        errorMsg = 'No response from server. Please check your connection.';
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMsg = err.message || 'Login failed';
      }
      
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  };
  
  // Logout user
  const logout = async () => {
    try {
      setLoading(true);
      // Call logout endpoint to invalidate token on server
      await axios.post(`${API_URL}/auth/logout`);
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      // Remove token from localStorage
      localStorage.removeItem('token');
      
      // Remove authorization header
      axios.defaults.headers.common['Authorization'] = '';
      
      // Reset user state
    setCurrentUser(null);
      
      // Redirect to login page
      window.location.href = '/login';
      
      setLoading(false);
    return { success: true };
    }
  };
  
  // Update user profile
  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      
      // Ensure year is in text format
      const formattedUserData = {
        ...userData,
        year: userData.year ? formatYearToText(userData.year) : userData.year
      };
      
      const response = await axios.put(`${API_URL}/users/profile`, formattedUserData);
      
      // Update current user state
      setCurrentUser(response.data);
      
      // Refresh all users list if admin
      if (currentUser.isAdmin) {
      loadAllUsers();
      }
      
      return { success: true, message: 'Profile updated successfully' };
    } catch (err) {
      setError(err.response?.data?.message || 'Profile update failed');
      return { 
        success: false, 
        message: err.response?.data?.message || 'Profile update failed' 
      };
    } finally {
      setLoading(false);
    }
  };
  
  // Check if user is admin
  const isAdmin = () => {
    return currentUser?.isAdmin === true;
  };
  
  // Check if user is authenticated (not a function, but a property)
  const isAuthenticated = currentUser !== null;
  
  // Admin functions for user management
  
  // Promote user to admin
  const promoteToAdmin = async (userId) => {
    try {
      const response = await axios.patch(`${API_URL}/users/${userId}/admin`, {
        isAdmin: true
      });
        
      // Refresh user list
      loadAllUsers();
        
        // Update current user if it's the same user
      if (currentUser && currentUser._id === userId) {
        setCurrentUser({...currentUser, isAdmin: true});
        }
        
      return { 
        success: true, 
        message: response.data.message || 'User promoted to admin successfully' 
      };
    } catch (err) {
      console.error('Error promoting user:', err);
      return { 
        success: false, 
        message: err.response?.data?.message || 'Failed to promote user' 
      };
    }
  };
  
  // Suspend user
  const suspendUser = async (userId) => {
    try {
      const response = await axios.patch(`${API_URL}/users/${userId}/status`, {
        status: 'suspended'
      });
        
      // Refresh user list
      loadAllUsers();
        
        // If this is the current user, log them out
      if (currentUser && currentUser._id === userId) {
          logout();
        }
        
      return { 
        success: true, 
        message: response.data.message || 'User suspended successfully' 
      };
    } catch (err) {
      console.error('Error suspending user:', err);
      return { 
        success: false, 
        message: err.response?.data?.message || 'Failed to suspend user' 
      };
    }
  };
  
  // Reactivate user
  const reactivateUser = async (userId) => {
    try {
      const response = await axios.patch(`${API_URL}/users/${userId}/status`, {
        status: 'active'
      });
        
      // Refresh user list
        loadAllUsers();
      
      return { 
        success: true, 
        message: response.data.message || 'User reactivated successfully' 
      };
    } catch (err) {
      console.error('Error reactivating user:', err);
      return { 
        success: false, 
        message: err.response?.data?.message || 'Failed to reactivate user' 
      };
    }
  };
  
  // Remove user
  const removeUser = async (userId) => {
    try {
      const response = await axios.delete(`${API_URL}/users/${userId}`);
      
      // Refresh user list
      loadAllUsers();
      
      // If this is the current user, log them out
      if (currentUser && currentUser._id === userId) {
        logout();
      }
      
      return { 
        success: true, 
        message: response.data.message || 'User removed successfully' 
      };
    } catch (err) {
      console.error('Error removing user:', err);
      return { 
        success: false, 
        message: err.response?.data?.message || 'Failed to remove user' 
      };
    }
  };
  
  // Get all users (for admin panel)
  const getAllUsers = () => {
    return allUsers;
  };
  
  const value = {
    currentUser,
    loading,
    error,
    register,
    login,
    logout,
    updateProfile,
    isAdmin,
    isAuthenticated,
    // Admin user management functions
    getAllUsers,
    promoteToAdmin,
    suspendUser,
    reactivateUser,
    removeUser
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 