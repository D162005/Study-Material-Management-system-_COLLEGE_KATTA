import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const API_URL = 'http://localhost:5002/api';

const StudyMaterialContext = createContext();

export const useStudyMaterial = () => {
  return useContext(StudyMaterialContext);
};

export const StudyMaterialProvider = ({ children }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [pendingMaterials, setPendingMaterials] = useState([]);
  const [myUploads, setMyUploads] = useState([]);
  const [bookmarkedMaterials, setBookmarkedMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUsingLocalStorage, setIsUsingLocalStorage] = useState(false);
  
  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Fetch approved materials
        try {
          const materialsResponse = await axios.get(`${API_URL}/study-materials?status=approved`);
          setMaterials(materialsResponse.data.materials || []);
          setIsUsingLocalStorage(materialsResponse.data.isUsingLocalStorage || false);
          console.log("Using local storage:", materialsResponse.data.isUsingLocalStorage || false);
        } catch (err) {
          console.error('Error fetching approved materials:', err);
          // If we can't connect to the server, we'll assume we're using local storage
          setIsUsingLocalStorage(true);
        }
        
        // Fetch user-specific data if authenticated
        if (isAuthenticated && currentUser) {
          try {
            // Fetch user's uploads
            const uploadsResponse = await axios.get(`${API_URL}/study-materials/my-uploads`);
            setMyUploads(uploadsResponse.data.materials || []);
          } catch (error) {
            console.error('Error fetching user uploads:', error);
          }
          
          try {
            // Fetch user's bookmarks
            const bookmarksResponse = await axios.get(`${API_URL}/study-materials/bookmarks`);
            setBookmarkedMaterials(bookmarksResponse.data.materials || []);
          } catch (error) {
            console.error('Error fetching bookmarks:', error);
          }
          
          // If user is admin, fetch pending materials
          if (currentUser.isAdmin) {
            try {
              const pendingResponse = await axios.get(`${API_URL}/study-materials?status=pending`);
              setPendingMaterials(pendingResponse.data.materials || []);
            } catch (error) {
              console.error('Error fetching pending materials:', error);
            }
          }
        }
      } catch (err) {
        console.error('Error loading study materials:', err);
        setError('Failed to load study materials');
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, [currentUser, isAuthenticated]);
  
  // Upload a new study material
  const addMaterial = async (materialData) => {
    if (!materialData || !materialData.title) {
      console.error('Missing required material data');
      setError('Missing material information. Please provide at least a title.');
      return null;
    }
    
    console.log('Uploading study material:', materialData.title);
    setLoading(true);
    
    try {
      // Make sure we have the token in the header
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No auth token found, user must be logged in to upload materials');
        setError('You must be logged in to upload study materials');
        setLoading(false);
        return null;
      }
      
      // Set the authorization header explicitly
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Convert fileSize to a number if it's a formatted string
      let fileSizeValue = materialData.fileSize;
      if (typeof materialData.fileSize === 'string') {
        // Store the original file size in bytes if available
        if (materialData.file && materialData.file.size) {
          fileSizeValue = materialData.file.size;
        } else {
          // Try to extract the number from the formatted string
          const sizeMatch = materialData.fileSize.match(/^([\d.]+)\s*(bytes|KB|MB|GB)?$/i);
          if (sizeMatch) {
            const value = parseFloat(sizeMatch[1]);
            const unit = sizeMatch[2]?.toLowerCase();
            
            if (unit === 'kb') {
              fileSizeValue = Math.round(value * 1024);
            } else if (unit === 'mb') {
              fileSizeValue = Math.round(value * 1024 * 1024);
            } else if (unit === 'gb') {
              fileSizeValue = Math.round(value * 1024 * 1024 * 1024);
            } else {
              fileSizeValue = value; // bytes
            }
          } else {
            fileSizeValue = 0; // fallback
          }
        }
      }
      
      console.log('Material size processed:', materialData.fileSize, '→', fileSizeValue, 'bytes');
      
      // Create material data for upload
      const formData = {
        title: materialData.title,
        description: materialData.description || '',
        branch: materialData.branch || '',
        year: materialData.year || '',
        subject: materialData.subject || '',
        materialType: materialData.materialType || 'Notes',
        tags: materialData.tags || [],
        courseCode: materialData.courseCode || '',
        fileType: materialData.fileType || 'pdf',
        fileSize: fileSizeValue,
        fileName: materialData.fileName || 'document.pdf',
        fileData: materialData.fileData
      };
      
      // Validate material type to ensure it matches one of the approved types
      const validTypes = ['Notes', 'Question Paper (PYQ)', 'Lab Manual', 'Project'];
      if (!validTypes.includes(formData.materialType)) {
        console.warn(`Invalid material type: ${formData.materialType}. Defaulting to Notes.`);
        formData.materialType = 'Notes';
      }
      
      console.log('Material details:', { 
        title: formData.title, 
        type: formData.materialType,
        fileType: formData.fileType,
        size: formData.fileSize
      });
      
      console.log('Sending study material upload request to:', `${API_URL}/study-materials`);
      
      const response = await axios.post(`${API_URL}/study-materials`, formData);
      
      if (!response.data || !response.data.material) {
        throw new Error('Invalid response from server');
      }
      
      const newMaterial = response.data.material;
      console.log('Study material uploaded successfully, ID:', newMaterial._id || newMaterial.id);
      
      // Update isUsingLocalStorage state if indicated in the response
      if (response.data.isUsingLocalStorage !== undefined) {
        setIsUsingLocalStorage(response.data.isUsingLocalStorage);
      }
    
      // Add to pending materials if admin
      if (currentUser?.isAdmin) {
        setPendingMaterials(prevMaterials => [newMaterial, ...prevMaterials]);
      }
      
      // Add to user's uploads
      setMyUploads(prevUploads => [newMaterial, ...prevUploads]);
      
      setLoading(false);
      return newMaterial;
    } catch (err) {
      console.error('Error adding study material:', err);
      if (err.response) {
        // Log detailed error information
        console.error('Server response:', err.response.status, err.response.data);
        setError(err.response.data.message || 'Failed to upload study material. Server returned an error.');
      } else if (err.request) {
        // The request was made but no response was received
        console.error('No response received');
        setError('Network error: Could not connect to the server');
      } else {
        // Something happened in setting up the request
        setError(err.message || 'Failed to upload study material. Please try again.');
      }
      setLoading(false);
      return null;
    }
  };
  
  // Approve a pending study material (admin only)
  const approveMaterial = async (materialId) => {
    try {
      setLoading(true);
      console.log('Sending approval request for study material:', materialId);
      
      // Make sure we have the token in the header
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No auth token found, user must be logged in to approve materials');
        setError('You must be logged in to approve study materials');
        setLoading(false);
        return false;
      }
      
      // Set the authorization header explicitly
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const response = await axios.patch(`${API_URL}/study-materials/${materialId}/status`, {
        status: 'approved'
      });
      
      if (!response.data || !response.data.material) {
        throw new Error('Invalid response from server');
      }
      
      const approvedMaterial = response.data.material;
      console.log('Study material approval successful:', approvedMaterial._id || approvedMaterial.id);
      
      // Update isUsingLocalStorage state if indicated in the response
      if (response.data.isUsingLocalStorage !== undefined) {
        setIsUsingLocalStorage(response.data.isUsingLocalStorage);
      }
      
      // Update pending materials list - remove the approved material
      setPendingMaterials(prevMaterials => prevMaterials.filter(material => 
        (material._id || material.id) !== materialId
      ));
      
      // Add to materials list - add to beginning
      setMaterials(prevMaterials => {
        // Check if the material already exists in the list to avoid duplicates
        const materialExists = prevMaterials.some(material => 
          (material._id || material.id) === materialId
        );
        if (materialExists) {
          return prevMaterials.map(material => 
            (material._id || material.id) === materialId ? { ...material, status: 'approved' } : material
          );
        }
        return [approvedMaterial, ...prevMaterials];
      });
      
      // Update in user's uploads if it belongs to them
      setMyUploads(prevUploads => 
        prevUploads.map(material => 
          (material._id || material.id) === materialId ? { ...material, status: 'approved' } : material
        )
      );
      
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error approving study material:', err);
      if (err.response) {
        console.error('Server response:', err.response.status, err.response.data);
        setError(err.response.data.message || 'Failed to approve study material');
      } else if (err.request) {
        console.error('No response received');
        setError('Network error: Could not connect to the server');
      } else {
        setError(err.message || 'Failed to approve study material');
      }
      setLoading(false);
      return false;
    }
  };
  
  // Reject a pending study material (admin only)
  const rejectMaterial = async (materialId) => {
    try {
      setLoading(true);
      console.log('Sending rejection request for study material:', materialId);
      
      // Make sure we have the token in the header
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No auth token found, user must be logged in to reject materials');
        setError('You must be logged in to reject study materials');
        setLoading(false);
        return false;
      }
      
      // Set the authorization header explicitly
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const response = await axios.patch(`${API_URL}/study-materials/${materialId}/status`, {
        status: 'rejected'
      });
      
      if (!response.data || !response.data.material) {
        throw new Error('Invalid response from server');
      }
      
      const rejectedMaterial = response.data.material;
      console.log('Study material rejection successful:', rejectedMaterial._id || rejectedMaterial.id);
      
      // Update isUsingLocalStorage state if indicated in the response
      if (response.data.isUsingLocalStorage !== undefined) {
        setIsUsingLocalStorage(response.data.isUsingLocalStorage);
      }
      
      // Update pending materials - remove the rejected material
      setPendingMaterials(prevMaterials => prevMaterials.filter(material => 
        (material._id || material.id) !== materialId
      ));
      
      // Update in user's uploads if it belongs to them
      setMyUploads(prevUploads => 
        prevUploads.map(material => 
          (material._id || material.id) === materialId ? { ...material, status: 'rejected' } : material
        )
      );
      
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error rejecting study material:', err);
      if (err.response) {
        console.error('Server response:', err.response.status, err.response.data);
        setError(err.response.data.message || 'Failed to reject study material');
      } else if (err.request) {
        console.error('No response received');
        setError('Network error: Could not connect to the server');
      } else {
        setError(err.message || 'Failed to reject study material');
      }
      setLoading(false);
      return false;
    }
  };
  
  // Download a study material
  const downloadMaterial = async (materialId) => {
    try {
      // Check if user is authenticated
      if (!isAuthenticated) {
        setError('Please log in to download study materials');
        // Redirect to login page
        window.location.href = '/login?redirect=study-materials';
        return false;
      }
      
      setLoading(true);
      console.log('Initiating download for study material:', materialId);
      
      // Make sure we have the token in the header (in case of protected materials)
      const token = localStorage.getItem('token');
      if (token) {
        // Set the authorization header explicitly
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await axios.get(`${API_URL}/study-materials/${materialId}/download`);
      
      if (!response.data || !response.data.fileContent) {
        throw new Error('No file content returned from server');
      }
      
      // Extract file info from response
      const { fileContent, fileName, fileType } = response.data;
      console.log('Study material download response received, content length:', 
        fileContent ? fileContent.length : 'unknown');
      
      try {
        // Create a blob from the file content
        const blob = base64ToBlob(fileContent, fileType);
        console.log('Created blob for download, size:', blob.size);
        
        // Create a download link and trigger it
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName || `download.${fileType || 'pdf'}`;
        document.body.appendChild(a);
        
        console.log('Triggering download for study material:', fileName);
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log('Download complete');
        setLoading(false);
        return true;
      } catch (blobError) {
        console.error('Error creating blob from base64:', blobError);
        throw new Error('Failed to process the downloaded file');
      }
    } catch (err) {
      console.error('Error downloading study material:', err);
      if (err.response) {
        console.error('Server response:', err.response.status, err.response.data);
        setError(err.response.data.message || 'Failed to download study material');
      } else if (err.request) {
        console.error('No response received');
        setError('Network error: Could not connect to the server');
      } else {
        setError(err.message || 'Failed to download study material');
      }
      setLoading(false);
      return false;
    }
  };
  
  // Toggle bookmark for a study material
  const toggleBookmark = async (materialId) => {
    try {
      if (!isAuthenticated) {
        setError('You must be logged in to bookmark study materials');
        return false;
      }
      
      console.log('Toggling bookmark for study material:', materialId);
      
      const response = await axios.post(`${API_URL}/study-materials/${materialId}/bookmark`);
      
      const { isBookmarked } = response.data;
      
      if (isBookmarked) {
        // Add to bookmarked materials
        const material = materials.find(m => (m._id || m.id) === materialId);
        if (material && !bookmarkedMaterials.some(m => (m._id || m.id) === materialId)) {
          setBookmarkedMaterials(prev => [material, ...prev]);
        }
      } else {
        // Remove from bookmarked materials
        setBookmarkedMaterials(prev => prev.filter(m => (m._id || m.id) !== materialId));
      }
      
      return isBookmarked;
    } catch (err) {
      console.error('Error toggling bookmark:', err);
      setError('Failed to bookmark study material');
      return false;
    }
  };
  
  // Check if a study material is bookmarked
  const isBookmarked = (materialId) => {
    return bookmarkedMaterials.some(material => (material._id || material.id) === materialId);
  };
  
  // Search study materials with filters
  const searchMaterials = (searchQuery, filters = {}) => {
    try {
      // Start with all materials
      let filteredMaterials = [...materials];
      
      // Apply search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredMaterials = filteredMaterials.filter(material => 
          material.title.toLowerCase().includes(query) ||
          material.description.toLowerCase().includes(query) ||
          (material.subject && material.subject.toLowerCase().includes(query))
        );
      }
      
      // Apply filters
      if (filters.branch) {
        filteredMaterials = filteredMaterials.filter(material => 
          material.branch === filters.branch
        );
      }
      
      if (filters.year) {
        filteredMaterials = filteredMaterials.filter(material => 
          material.year === filters.year
        );
      }
      
      if (filters.semester) {
        filteredMaterials = filteredMaterials.filter(material => 
          material.semester === filters.semester
        );
      }
      
      if (filters.subject) {
        filteredMaterials = filteredMaterials.filter(material => 
          material.subject === filters.subject
        );
      }
      
      if (filters.materialType) {
        filteredMaterials = filteredMaterials.filter(material => 
          material.materialType === filters.materialType
        );
      }
      
      return filteredMaterials;
    } catch (err) {
      console.error('Error searching materials:', err);
      return [];
    }
  };
  
  // Helper function to convert base64 to blob
  const base64ToBlob = (base64, type) => {
    try {
      // Handle both formats: with data URI prefix and without
      let base64Data;
      if (base64.includes(',')) {
        base64Data = base64.split(',')[1];
      } else {
        base64Data = base64;
      }
      
      const byteCharacters = atob(base64Data);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      return new Blob(byteArrays, { type: `application/${type}` });
    } catch (error) {
      console.error('Error in base64ToBlob conversion:', error);
      throw error;
    }
  };
  
  // Context value
  const value = {
    materials,
    pendingMaterials,
    myUploads,
    bookmarkedMaterials,
    loading,
    error,
    isUsingLocalStorage,
    addMaterial,
    approveMaterial,
    rejectMaterial,
    downloadMaterial,
    toggleBookmark,
    isBookmarked,
    searchMaterials
  };
  
  return (
    <StudyMaterialContext.Provider value={value}>
      {children}
    </StudyMaterialContext.Provider>
  );
};

export default StudyMaterialProvider; 