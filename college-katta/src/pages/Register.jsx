import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock, FaUserPlus, FaGraduationCap, FaSchool } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { formatYearToText } from '../utils/formatUtils';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    branch: 'Computer Science',
    year: 'First Year'
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const branches = [
    'Computer Science',
    'Computer Engineering',
    'Information Technology',
    'AI & DS'
  ];
  
  const years = [
    'First Year',
    'Second Year',
    'Third Year',
    'Fourth Year'
  ];
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { fullName, username, email, password, confirmPassword, branch, year } = formData;
    
    // Basic validation
    if (!fullName || !username || !email || !password || !confirmPassword || !branch || !year) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      console.log('Submitting registration data:', { fullName, username, email, password, branch, year });
      
      // Ensure year is in text format
      const formattedYear = formatYearToText(year);
      
      const response = await register({ 
        fullName, 
        username, 
        email, 
        password, 
        branch, 
        year: formattedYear 
      });
      
      if (response.success) {
        setSuccess('Registration successful! Redirecting to login page...');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(response.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Registration failed. Please try again. ' + (error.message || ''));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800">Create an account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Join College-Katta to access study materials
          </p>
        </div>
        
        <div className="mt-8 bg-white py-8 px-4 shadow-sm rounded-lg sm:px-10 border border-gray-200">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-4">
              <p>{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-500 text-green-700 p-4">
              <p>{success}</p>
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <div className="flex items-center justify-center bg-gray-100 rounded-l-md border border-r-0 border-gray-300 px-3">
                  <FaUser className="text-gray-500 h-5 w-5" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="focus:ring-blue-600 focus:border-blue-600 flex-1 block w-full border-gray-300 rounded-r-md text-base py-2.5 px-3 border text-gray-900 bg-white font-medium"
                  placeholder="John Doe"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <div className="flex items-center justify-center bg-gray-100 rounded-l-md border border-r-0 border-gray-300 px-3">
                  <FaUser className="text-gray-500 h-5 w-5" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="focus:ring-blue-600 focus:border-blue-600 flex-1 block w-full border-gray-300 rounded-r-md text-base py-2.5 px-3 border text-gray-900 bg-white font-medium"
                  placeholder="johndoe"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Username must be at least 3 characters long
              </p>
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <div className="flex items-center justify-center bg-gray-100 rounded-l-md border border-r-0 border-gray-300 px-3">
                  <FaEnvelope className="text-gray-500 h-5 w-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="focus:ring-blue-600 focus:border-blue-600 flex-1 block w-full border-gray-300 rounded-r-md text-base py-2.5 px-3 border text-gray-900 bg-white font-medium"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="branch" className="block text-sm font-medium text-gray-700">
                  Branch
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <div className="flex items-center justify-center bg-gray-100 rounded-l-md border border-r-0 border-gray-300 px-3">
                    <FaGraduationCap className="text-gray-500 h-5 w-5" />
                  </div>
                  <select
                    id="branch"
                    name="branch"
                    value={formData.branch}
                    onChange={handleChange}
                    required
                    className="focus:ring-blue-600 focus:border-blue-600 flex-1 block w-full border-gray-300 rounded-r-md text-base py-2.5 px-3 border text-gray-900 bg-white font-medium"
                  >
                    {branches.map(branch => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                  Year
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <div className="flex items-center justify-center bg-gray-100 rounded-l-md border border-r-0 border-gray-300 px-3">
                    <FaSchool className="text-gray-500 h-5 w-5" />
                  </div>
                  <select
                    id="year"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    required
                    className="focus:ring-blue-600 focus:border-blue-600 flex-1 block w-full border-gray-300 rounded-r-md text-base py-2.5 px-3 border text-gray-900 bg-white font-medium"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <div className="flex items-center justify-center bg-gray-100 rounded-l-md border border-r-0 border-gray-300 px-3">
                  <FaLock className="text-gray-500 h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="focus:ring-blue-600 focus:border-blue-600 flex-1 block w-full border-gray-300 rounded-r-md text-base py-2.5 px-3 border text-gray-900 bg-white font-medium"
                  placeholder="••••••••"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Password must be at least 6 characters long
              </p>
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <div className="flex items-center justify-center bg-gray-100 rounded-l-md border border-r-0 border-gray-300 px-3">
                  <FaLock className="text-gray-500 h-5 w-5" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="focus:ring-blue-600 focus:border-blue-600 flex-1 block w-full border-gray-300 rounded-r-md text-base py-2.5 px-3 border text-gray-900 bg-white font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-75"
              >
                {loading ? (
                  <span className="inline-flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Registering...
                  </span>
                ) : (
                  <span className="inline-flex items-center">
                    <FaUserPlus className="mr-2" />
                    Create Account
                  </span>
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Already have an account?
                </span>
              </div>
            </div>
            
            <div className="mt-6">
              <Link
                to="/login"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign in instead
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register; 