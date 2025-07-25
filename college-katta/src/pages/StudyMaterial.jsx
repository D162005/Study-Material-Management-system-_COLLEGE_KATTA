import { useState, useEffect } from 'react';
import { FaSearch, FaFilter, FaFilePdf, FaDownload, FaBookmark, FaRegBookmark, FaCheck, FaSpinner, FaSignInAlt } from 'react-icons/fa';
import { useStudyMaterial } from '../context/StudyMaterialContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const StudyMaterial = () => {
  const { materials, toggleBookmark, isBookmarked, bookmarkedMaterials, downloadMaterial } = useStudyMaterial();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    branch: '',
    year: '',
    type: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [actionStates, setActionStates] = useState({
    downloading: {},
    bookmarking: {}
  });

  // Apply filters and search
  useEffect(() => {
    let result = [...materials];
    
    // Apply search query
    if (searchQuery) {
      result = result.filter(material => 
        material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (material.subject && material.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (material.description && material.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Apply filters
    if (filters.branch) {
      result = result.filter(material => material.branch === filters.branch);
    }
    
    if (filters.year) {
      // Direct comparison with the exact string value
      result = result.filter(material => material.year === filters.year);
    }
    
    if (filters.type) {
      result = result.filter(material => material.materialType === filters.type);
    }
    
    // Sort by year (First Year, Second Year, Third Year, Fourth Year)
    const yearOrder = {
      'First Year': 1,
      'Second Year': 2,
      'Third Year': 3,
      'Fourth Year': 4
    };
    
    result.sort((a, b) => {
      const yearA = yearOrder[a.year] || 999; // Default high value for unknown years
      const yearB = yearOrder[b.year] || 999;
      return yearA - yearB;
    });
    
    setFilteredMaterials(result);
  }, [searchQuery, filters, materials, bookmarkedMaterials]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  const resetFilters = () => {
    setFilters({
      branch: '',
      year: '',
      type: '',
    });
    setSearchQuery('');
  };

  // Handle download click
  const handleDownload = async (materialId) => {
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      return;
    }
    
    // Set downloading state for this material
    setActionStates(prev => ({
      ...prev,
      downloading: { ...prev.downloading, [materialId]: true }
    }));
    
    try {
      // Download the material using the context function
      await downloadMaterial(materialId);
    } catch (error) {
      console.error('Error downloading material:', error);
    } finally {
      // Show downloading state for 1.5 seconds to provide feedback
      setTimeout(() => {
        setActionStates(prev => ({
          ...prev,
          downloading: { ...prev.downloading, [materialId]: false }
        }));
      }, 1500);
    }
  };

  // Handle bookmark click
  const handleToggleBookmark = async (materialId) => {
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      return;
    }
    
    // Set bookmarking state for this material
    setActionStates(prev => ({
      ...prev,
      bookmarking: { ...prev.bookmarking, [materialId]: true }
    }));
    
    try {
      await toggleBookmark(materialId);
      // Context will handle updating the bookmarked materials list
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      // Clear bookmarking state after a short delay
      setTimeout(() => {
        setActionStates(prev => ({
          ...prev,
          bookmarking: { ...prev.bookmarking, [materialId]: false }
        }));
      }, 300);
    }
  };

  const hasActiveFilters = filters.branch || filters.year || filters.type || searchQuery;

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Render download or login button based on authentication status
  const renderDownloadButton = (materialId) => {
    if (isAuthenticated) {
      return (
        <button
          onClick={() => handleDownload(materialId)}
          className="flex items-center gap-1 text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          disabled={actionStates.downloading[materialId]}
        >
          {actionStates.downloading[materialId] ? (
            <FaCheck className="mr-1" />
          ) : (
            <FaDownload className="mr-1" />
          )}
          Download
        </button>
      );
    } else {
      return (
        <Link
          to="/login?redirect=study-materials"
          className="flex items-center gap-1 text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <FaSignInAlt className="mr-1" />
          Login to Download
        </Link>
      );
    }
  };

  return (
    <div className="container mx-auto px-4">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4">
          <h1 className="text-2xl font-bold mb-4 md:mb-0">Study Materials</h1>
          
          {hasActiveFilters && (
            <button 
              onClick={resetFilters}
              className="px-4 py-2 bg-white text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors mb-4 md:mb-0 text-sm font-medium"
            >
              Clear All Filters
            </button>
          )}
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 bg-white text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors text-sm font-medium md:hidden"
          >
            <FaFilter className="mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <div className={`space-y-4 md:block ${showFilters ? 'block' : 'hidden'}`}>
              <div>
                <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <select
                  id="branch"
                  name="branch"
                  value={filters.branch}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">All Branches</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Computer Engineering">Computer Engineering</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="AI & DS">AI & DS</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <select
                  id="year"
                  name="year"
                  value={filters.year}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">All Years</option>
                  <option value="First Year">First Year</option>
                  <option value="Second Year">Second Year</option>
                  <option value="Third Year">Third Year</option>
                  <option value="Fourth Year">Fourth Year</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  id="type"
                  name="type"
                  value={filters.type}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">All Types</option>
                  <option value="Notes">Notes</option>
                  <option value="Assignment">Assignment</option>
                  <option value="Question Paper">Question Paper</option>
                  <option value="Lab Manual">Lab Manual</option>
                  <option value="Syllabus">Syllabus</option>
                  <option value="Project Report">Project Report</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-blue-700 hover:text-blue-800 text-sm font-medium md:block hidden"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
          
          <div className="md:col-span-3">
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by title, subject, or description..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {filteredMaterials.length === 0 ? (
              <div className="bg-white p-8 text-center rounded-lg shadow-sm border border-gray-100">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-gray-900 text-lg font-medium">No study materials found</h3>
                <p className="mt-1 text-gray-500">
                  {hasActiveFilters ? 'Try adjusting your search filters' : 'No study materials available yet'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMaterials.map(material => (
                  <div key={material._id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="relative bg-blue-50 py-6 flex items-center justify-center">
                      <div className="absolute right-2 top-2">
                        <button 
                          onClick={() => handleToggleBookmark(material._id)}
                          className="p-1.5 rounded-full bg-white/80 text-gray-500 hover:text-yellow-500 focus:outline-none"
                          disabled={actionStates.bookmarking[material._id]}
                        >
                          {actionStates.bookmarking[material._id] ? (
                            <FaSpinner className="animate-spin text-base" />
                          ) : isBookmarked(material._id) ? (
                            <FaBookmark className="text-yellow-500" />
                          ) : (
                            <FaRegBookmark />
                          )}
                        </button>
                      </div>
                      <div className="absolute left-2 top-2">
                        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-md">
                          {material.materialType || 'Study Material'}
                          </span>
                      </div>
                      <FaFilePdf className="text-red-500 text-5xl" />
                    </div>
                    
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-800 mb-1 line-clamp-1">{material.title}</h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{material.description || 'No description available'}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        {material.branch && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-md">
                            {material.branch}
                          </span>
                        )}
                        {material.year && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                            {material.year}
                          </span>
                        )}
                        {material.subject && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                            {material.subject}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {formatDate(material.createdAt)}
                        </span>
                        
                        {renderDownloadButton(material._id)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyMaterial; 