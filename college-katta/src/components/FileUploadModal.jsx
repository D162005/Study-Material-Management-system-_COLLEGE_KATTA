import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaUpload, FaSpinner } from 'react-icons/fa';
import { useFileContext } from '../context/FileContext';
import { useAuth } from '../context/AuthContext';

const FileUploadModal = ({ isOpen, onClose }) => {
  const { addFile } = useFileContext();
  const { currentUser } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    branch: '',
    year: '',
    semester: '',
    subject: '',
    type: 'Notes',
  });
  const [subjectList, setSubjectList] = useState([]);
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [error, setError] = useState('');
  const [fileData, setFileData] = useState({
    file: null,
    fileName: '',
    fileType: '',
    fileSize: '',
    fileSizeBytes: 0,
    fileContent: null
  });
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);

  // Subject database by branch (simulated)
  const subjectsByBranch = {
    'Computer Science': [
      'Data Structures', 
      'Algorithms', 
      'Database Management Systems', 
      'Operating Systems', 
      'Computer Networks', 
      'Software Engineering'
    ],
    'Computer Engineering': [
      'Computer Architecture',
      'Embedded Systems',
      'Digital Logic Design',
      'Microprocessors',
      'Computer Graphics',
      'System Programming'
    ],
    'Information Technology': [
      'Web Development', 
      'Data Mining', 
      'Cyber Security', 
      'Cloud Computing', 
      'Mobile Application Development'
    ],
    'AI & DS': [
      'Machine Learning',
      'Data Science',
      'Neural Networks',
      'Deep Learning',
      'Natural Language Processing',
      'Big Data Analytics'
    ]
  };

  // Update subject list when branch changes
  useEffect(() => {
    if (formData.branch && subjectsByBranch[formData.branch]) {
      setSubjectList(subjectsByBranch[formData.branch]);
    } else {
      setSubjectList([]);
    }
  }, [formData.branch]);

  // Handle click outside modal to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        if (!isUploading) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, isUploading]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check if file is too large (>10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File too large. Maximum size is 10MB.');
      return;
    }
    
      // Check if file type is allowed
      const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
      const allowedTypes = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'zip', 'rar', 'txt'];
      
      if (!allowedTypes.includes(fileExtension)) {
        setError(`File type .${fileExtension} is not allowed. Please upload a PDF, DOC, PPT, image, or compressed file.`);
      return;
    }
    
      // Set basic file preview type
      setPreview(fileExtension);
      
      // Read file as base64
      const reader = new FileReader();
      reader.onload = (event) => {
        // Log first few chars to verify base64 encoding is correct
        console.log('File loaded as base64, first 20 chars:', event.target.result.substring(0, 20));
        
        setFileData({
          file: selectedFile,
          fileName: selectedFile.name,
          fileType: fileExtension,
          fileSize: formatFileSize(selectedFile.size),
          fileSizeBytes: selectedFile.size,
          fileContent: event.target.result
        });
      };
      
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        setError('Error processing file. Please try again.');
      };
      
      reader.readAsDataURL(selectedFile);
      setError(null);
    }
  };

  // Utility function to format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Filter subjects when user types in subject field
    if (name === 'subject') {
      if (value) {
        const filtered = subjectList.filter(subject => 
          subject.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredSubjects(filtered);
        setShowSubjectDropdown(true);
      } else {
        setFilteredSubjects([]);
        setShowSubjectDropdown(false);
      }
    }
  };

  const handleSubjectSelect = (subject) => {
    setFormData(prev => ({
      ...prev,
      subject
    }));
    setShowSubjectDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation checks
    let hasError = false;
    let errorMessage = '';
    
    if (!formData.title) {
      errorMessage = 'Please enter a title for your upload.';
      hasError = true;
    } else if (!formData.branch) {
      errorMessage = 'Please select a branch.';
      hasError = true;
    } else if (!formData.year) {
      errorMessage = 'Please select a year.';
      hasError = true;
    } else if (!formData.subject) {
      errorMessage = 'Please select a subject.';
      hasError = true;
    } else if (!fileData.file) {
      errorMessage = 'Please upload a file.';
      hasError = true;
    }
    
    if (hasError) {
      setError(errorMessage);
      return;
    }
    
    setIsUploading(true);
    setError('');
    setUploadProgress(10); // Start progress
    
    try {
      // Prepare the file data to be sent
      const fileToUpload = {
          ...formData,
        fileName: fileData.fileName,
        fileType: fileData.fileType,
        fileSize: fileData.fileSize,
        fileSizeBytes: fileData.fileSizeBytes,
        file: fileData.file,
        fileData: fileData.fileContent
      };
      
      setTimeout(() => setUploadProgress(30), 500); // Simulate progress update
      
      console.log('Preparing to upload file:', fileData.fileName);
      
      // Call the addFile function from context to upload the file
      const newFile = await addFile(fileToUpload);
      
      if (newFile) {
        // Update progress to complete
        setUploadProgress(100);
        console.log('File upload successful!');
        
        // Reset form
            setFormData({
              title: '',
              description: '',
              branch: '',
              year: '',
              semester: '',
              subject: '',
          type: 'Notes'
        });
        
        setFileData({
          file: null,
          fileName: '',
          fileType: '',
          fileSize: '',
          fileSizeBytes: 0,
          fileContent: null
        });
        
        setSubjectList([]);
        
        // Show success notification and close modal after delay
        setError('');
        const successMessage = "File uploaded successfully! It will be available after review.";
        setError(successMessage);
        setTimeout(() => {
          setIsUploading(false);
          onClose();
        }, 2000);
      } else {
        setError('Failed to upload file. Please try again.');
        setIsUploading(false);
        setUploadProgress(0);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('An error occurred while uploading. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div 
        ref={modalRef}
        className="bg-white w-full max-w-2xl rounded-lg shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="border-b border-gray-200 p-4 flex justify-between items-center bg-gray-50">
          <h3 className="text-xl font-semibold text-gray-800">Upload Study Material</h3>
          {!isUploading && (
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes />
            </button>
          )}
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Upload File
              </label>
              
              {fileData.file ? (
                <div className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="w-12 h-12 flex items-center justify-center bg-white rounded-lg shadow-sm">
                    {preview === 'pdf' ? (
                      <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path>
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2H5v-2h10zm0-3v2H5v-2h10zm-3-5v2H8V8h4z" clipRule="evenodd"></path>
                      </svg>
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="font-medium text-gray-800 truncate">{fileData.fileName}</p>
                    <p className="text-sm text-gray-500">{(fileData.file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setFileData({
                        file: null,
                        fileName: '',
                        fileType: '',
                        fileSize: '',
                        fileSizeBytes: 0,
                        fileContent: null
                      });
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="p-1 rounded-full text-gray-500 hover:bg-gray-200"
                  >
                    <FaTimes />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:border-blue-500 cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <FaUpload className="mx-auto text-blue-400 text-3xl mb-2" />
                  <p className="text-gray-700">Click to select a file or drag and drop</p>
                  <p className="text-xs text-gray-500 mt-1">Supported formats: PDF, DOC, DOCX, PPT, PPTX, image, compressed file</p>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.zip,.rar,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="type">
                  File Type
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="Notes">Notes</option>
                  <option value="Question Paper (PYQ)">PYQ</option>
                  <option value="Project">Project</option>
                  <option value="Lab Manual">Lab Manual</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of the material"
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              ></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="branch">
                  Branch *
                </label>
                <select
                  id="branch"
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  required
                >
                  <option value="">Select branch</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Computer Engineering">Computer Engineering</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="AI & DS">AI & DS</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="subject">
                  Subject
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Enter subject"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    onFocus={() => {
                      if (formData.subject && subjectList.length > 0) {
                        const filtered = subjectList.filter(subject => 
                          subject.toLowerCase().includes(formData.subject.toLowerCase())
                        );
                        setFilteredSubjects(filtered);
                        setShowSubjectDropdown(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay closing dropdown to allow for selection
                      setTimeout(() => {
                        setShowSubjectDropdown(false);
                      }, 200);
                    }}
                  />
                  
                  {showSubjectDropdown && filteredSubjects.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredSubjects.map((subject, index) => (
                        <div 
                          key={index}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                          onClick={() => handleSubjectSelect(subject)}
                        >
                          {subject}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="year">
                  Year
                </label>
                <select
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">Select year</option>
                  <option value="First Year">First Year</option>
                  <option value="Second Year">Second Year</option>
                  <option value="Third Year">Third Year</option>
                  <option value="Fourth Year">Fourth Year</option>
                </select>
              </div>
            </div>

            {isUploading && (
              <div className="mb-6">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 mt-1 text-center">Uploading... {uploadProgress}%</p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              {!isUploading && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
              )}
              
              <button
                type="submit"
                disabled={isUploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
              >
                {isUploading ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Uploading
                  </>
                ) : 'Upload'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FileUploadModal; 