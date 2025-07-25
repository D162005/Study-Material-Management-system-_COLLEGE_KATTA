import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const GeneralChatContext = createContext();

// Configure API URL - use the simple chat server for now
const API_URL = 'http://localhost:5002/api';

export const useGeneralChat = () => useContext(GeneralChatContext);

export const GeneralChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadTimestamp, setLastReadTimestamp] = useState(() => {
    const saved = localStorage.getItem('lastReadChatTimestamp');
    return saved ? new Date(saved) : new Date();
  });
  const { token, isAuthenticated } = useAuth();

  // Fetch chat messages
  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/chat`);
      console.log('Chat API response:', response.data);
      
      // Handle different response structures
      let messagesData = Array.isArray(response.data) 
        ? response.data 
        : response.data.messages || [];
      
      // Sort messages by timestamp (oldest first)
      messagesData = messagesData.sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      );
      
      setMessages(messagesData);
      
      // Calculate unread messages
      const newUnreadCount = messagesData.filter(
        msg => new Date(msg.createdAt) > lastReadTimestamp
      ).length;
      
      setUnreadCount(newUnreadCount);
    } catch (err) {
      console.error('Error fetching chat messages:', err);
      setError(err.response?.data?.message || 'Failed to load chat messages');
    } finally {
      setLoading(false);
    }
  };

  // Send a new message
  const sendMessage = async (messageText) => {
    if (!isAuthenticated) {
      setError('You must be logged in to send messages');
      return false;
    }

    if (!messageText.trim()) {
      setError('Message cannot be empty');
      return false;
    }

    setLoading(true);
    setError(null);
    try {
      const config = {
        headers: {
          'Authorization': `Bearer ${token || 'dummy-token'}`
        }
      };
      
      const response = await axios.post(`${API_URL}/chat`, { message: messageText }, config);
      console.log('Send message response:', response.data);
      
      // Handle different response structures
      const newMessage = response.data.message || response.data;
      
      // Add new message to the end of the array (maintaining chronological order)
      setMessages(prevMessages => [...prevMessages, newMessage]);
      return true;
    } catch (err) {
      console.error('Error sending chat message:', err);
      setError(err.response?.data?.message || 'Failed to send message');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Mark all messages as read
  const markAllAsRead = () => {
    const now = new Date();
    setLastReadTimestamp(now);
    localStorage.setItem('lastReadChatTimestamp', now.toISOString());
    setUnreadCount(0);
  };

  // Initial fetch of messages
  useEffect(() => {
    fetchMessages();
    
    // Set up a polling interval to fetch new messages periodically
    const intervalId = setInterval(fetchMessages, 10000); // Every 10 seconds
    
    return () => clearInterval(intervalId);
  }, []);

  return (
    <GeneralChatContext.Provider
      value={{
        messages,
        loading,
        error,
        unreadCount,
        fetchMessages,
        sendMessage,
        markAllAsRead
      }}
    >
      {children}
    </GeneralChatContext.Provider>
  );
};

export default GeneralChatContext; 