import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane } from 'react-icons/fa';
import { useGeneralChat } from '../context/GeneralChatContext';
import { useAuth } from '../context/AuthContext';

const ChatDiscussion = () => {
  const { messages, loading, error, sendMessage, fetchMessages, markAllAsRead } = useGeneralChat();
  const { isAuthenticated, currentUser } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Mark messages as read when page loads
  useEffect(() => {
    if (isAuthenticated) {
      markAllAsRead();
    }
  }, [isAuthenticated, markAllAsRead]);

  // Scroll to bottom when new messages arrive or on initial load
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Format the timestamp
  const formatTimestamp = (timestamp) => {
    try {
      const now = new Date();
      const messageDate = new Date(timestamp);
      const diffInSeconds = Math.floor((now - messageDate) / 1000);
      
      if (diffInSeconds < 60) {
        return 'just now';
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
      } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} ${days === 1 ? 'day' : 'days'} ago`;
      } else {
        // Format as MM/DD/YYYY
        return messageDate.toLocaleDateString();
      }
    } catch (err) {
      return 'unknown time';
    }
  };

  // Get user display name from sender object
  const getUserDisplayName = (sender) => {
    if (!sender) return 'Unknown User';
    return sender.fullName || sender.name || sender.username || 'User';
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const success = await sendMessage(messageText);
      if (success) {
        setMessageText('');
        // Refresh messages to get the latest
        fetchMessages();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Chat Discussion</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-blue-600 text-white p-4">
          <h2 className="text-xl font-semibold m-0">College Chat</h2>
          <p className="text-sm m-0">A place to discuss with peers</p>
        </div>
        
        <div 
          ref={chatContainerRef} 
          className="p-4 bg-gray-50 flex flex-col" 
          style={{ height: '60vh', overflowY: 'auto' }}
        >
          {loading && messages.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex justify-center items-center h-full text-gray-500">
              <p>No messages yet. Be the first to start the conversation!</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div 
                  key={msg._id} 
                  className={`mb-4 rounded-lg p-3 ${
                    currentUser?._id === msg.sender?._id 
                      ? 'self-end bg-green-100 max-w-[80%]' 
                      : 'self-start bg-white border border-gray-200 max-w-[80%]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-blue-600">
                      {getUserDisplayName(msg.sender)}
                      {msg.sender?.role === 'admin' && (
                        <span className="ml-2 bg-red-600 text-white text-xs px-2 py-1 rounded">Admin</span>
                      )}
                    </span>
                    <small className="text-gray-500">{formatTimestamp(msg.createdAt)}</small>
                  </div>
                  <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{msg.message}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
              <span>{error}</span>
            </div>
          )}
          
          {isAuthenticated ? (
            <form onSubmit={handleSubmit}>
              <div className="flex">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={submitting}
                  required
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 placeholder-gray-500"
                />
                <button 
                  type="submit" 
                  className={`bg-blue-600 text-white px-4 py-2 rounded-r-lg ${
                    submitting || !messageText.trim() 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-blue-700'
                  }`}
                  disabled={submitting || !messageText.trim()}
                >
                  {submitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <FaPaperPlane />
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
              Please <a href="/login" className="text-blue-700 font-bold hover:underline">login</a> to join the conversation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatDiscussion; 