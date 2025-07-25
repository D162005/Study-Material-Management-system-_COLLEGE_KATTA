import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaHome, FaBook, FaUpload, FaBookmark, FaUser, FaSignInAlt, FaSignOutAlt, FaUsers, FaFileAlt, FaFlask, FaClock, FaFolder, FaClipboardList, FaPlus, FaComments, FaGraduationCap, FaComment } from "react-icons/fa";
import FileUploadModal from "./FileUploadModal";
import { useAuth } from "../context/AuthContext";
import { useGeneralChat } from "../context/GeneralChatContext";
import NotificationBar from "./NotificationBar";

const Layout = ({ children }) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout, isAdmin } = useAuth();
  const { unreadCount } = useGeneralChat();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigateToChat = () => {
    navigate('/chat-discussion');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-white font-bold text-xl flex items-center">
              <span className="bg-white text-blue-600 p-1 rounded-md mr-2"><FaBook /></span> College-Katta
            </Link>
          </div>

          {/* Header Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className="text-white hover:text-blue-100 px-3 py-2 rounded-md flex items-center text-base font-medium transition-colors duration-200"
            >
              <span className="bg-white text-blue-600 p-1 rounded-md mr-2"><FaHome /></span> Home
            </Link>
            <Link 
              to="/study-materials" 
              className="text-white hover:text-blue-100 px-3 py-2 rounded-md flex items-center text-base font-medium transition-colors duration-200"
            >
              <span className="bg-white text-blue-600 p-1 rounded-md mr-2"><FaGraduationCap /></span> Study Materials
            </Link>
            {currentUser && (
              <>
                <Link 
                  to="/my-uploads" 
                  className="text-white hover:text-blue-100 px-3 py-2 rounded-md flex items-center text-base font-medium transition-colors duration-200"
                >
                  <span className="bg-white text-blue-600 p-1 rounded-md mr-2"><FaUpload /></span> My Uploads
                </Link>
                <Link 
                  to="/saved" 
                  className="text-white hover:text-blue-100 px-3 py-2 rounded-md flex items-center text-base font-medium transition-colors duration-200"
                >
                  <span className="bg-white text-blue-600 p-1 rounded-md mr-2"><FaBookmark /></span> Saved
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center space-x-5">
            {currentUser ? (
              <div className="relative">
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 text-white hover:text-blue-100 focus:outline-none"
                >
                  <div className="w-9 h-9 bg-white text-blue-600 rounded-full flex items-center justify-center">
                    <FaUser className="text-xl" />
                  </div>
                  <span className="hidden md:inline font-medium">Hi {currentUser.fullName}</span>
                </Link>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="bg-white text-blue-600 px-3 py-2 rounded-md flex items-center text-base font-medium hover:bg-blue-50 transition-colors duration-200"
              >
                <FaSignInAlt className="mr-2" /> Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar and Content */}
      <div className="flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-white shadow-md md:min-h-screen border-r border-gray-200 sticky top-16 h-screen md:h-[calc(100vh-3.75rem)]">
          <nav className="p-4 overflow-y-auto h-full">
            <ul className="space-y-3">
              {/* Public Links - For both logged in and non-logged in users */}
              {!currentUser && (
                <>
                  <li>
                    <Link
                      to="/"
                      className={`flex items-center space-x-2 p-2 rounded-md transition-all duration-200 ${
                        location.pathname === "/"
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                    >
                      <span className="bg-blue-600 text-white p-1 rounded-md"><FaHome /></span>
                      <span>Home</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/study-materials"
                      className={`flex items-center space-x-2 p-2 rounded-md transition-all duration-200 ${
                        location.pathname === "/study-materials"
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                    >
                      <span className="bg-blue-600 text-white p-1 rounded-md"><FaGraduationCap /></span>
                      <span>Study Materials</span>
                    </Link>
                  </li>
                </>
              )}

              {/* User Links - Only for logged in users */}
              {currentUser && (
                <>
                  <li>
                    <Link
                      to="/recent"
                      className={`flex items-center space-x-2 p-2 rounded-md transition-all duration-200 ${
                        location.pathname === "/recent"
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                    >
                      <span className="bg-blue-600 text-white p-1 rounded-md"><FaClock /></span>
                      <span>Recent</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/personal-files"
                      className={`flex items-center space-x-2 p-2 rounded-md transition-all duration-200 ${
                        location.pathname === "/personal-files"
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                    >
                      <span className="bg-blue-600 text-white p-1 rounded-md"><FaFolder /></span>
                      <span>My Files</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/projects"
                      className={`flex items-center space-x-2 p-2 rounded-md transition-all duration-200 ${
                        location.pathname === "/projects"
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                    >
                      <span className="bg-blue-600 text-white p-1 rounded-md"><FaFileAlt /></span>
                      <span>Projects</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/pyq"
                      className={`flex items-center space-x-2 p-2 rounded-md transition-all duration-200 ${
                        location.pathname === "/pyq"
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                    >
                      <span className="bg-blue-600 text-white p-1 rounded-md"><FaClipboardList /></span>
                      <span>PYQ</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/notes"
                      className={`flex items-center space-x-2 p-2 rounded-md transition-all duration-200 ${
                        location.pathname === "/notes"
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                    >
                      <span className="bg-blue-600 text-white p-1 rounded-md"><FaBook /></span>
                      <span>Notes</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/lab-manual"
                      className={`flex items-center space-x-2 p-2 rounded-md transition-all duration-200 ${
                        location.pathname === "/lab-manual"
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                    >
                      <span className="bg-blue-600 text-white p-1 rounded-md"><FaFlask /></span>
                      <span>Lab Manual</span>
                    </Link>
                  </li>
                </>
              )}

              {/* Admin Links - Only shown to admin users */}
              {currentUser && isAdmin() && (
                <>
                  <li className="pt-3">
                    <div className="border-t border-gray-200 my-2"></div>
                    <div className="text-xs uppercase text-gray-500 font-semibold px-2 mb-2">Admin</div>
                  </li>
                  <li>
                    <Link
                      to="/admin/users"
                      className={`flex items-center space-x-2 p-2 rounded-md transition-all duration-200 ${
                        location.pathname === "/admin/users"
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                    >
                      <span className="bg-blue-600 text-white p-1 rounded-md"><FaUsers /></span>
                      <span>Manage Users</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/admin/pending-files"
                      className={`flex items-center space-x-2 p-2 rounded-md transition-all duration-200 ${
                        location.pathname === "/admin/pending-files"
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                    >
                      <span className="bg-blue-600 text-white p-1 rounded-md"><FaFileAlt /></span>
                      <span>Pending Files</span>
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          <NotificationBar />
          {children}
          
          {/* Upload Button - Positioned at bottom right */}
          {currentUser && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="fixed bottom-8 right-8 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 z-10 transition-colors duration-200"
              aria-label="Upload file"
            >
              <FaPlus size={24} />
            </button>
          )}

          {/* Chat Discussion Button - Positioned at bottom left */}
          {currentUser && (
            <button
              onClick={navigateToChat}
              className={`fixed bottom-8 left-8 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 z-10 transition-colors duration-200 ${
                location.pathname === "/chat-discussion" ? "bg-blue-800" : ""
              }`}
              aria-label="Chat Discussion"
            >
              <FaComments size={24} />
              {location.pathname !== "/chat-discussion" && unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )}
        </main>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <FileUploadModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} />
      )}
    </div>
  );
};

export default Layout;