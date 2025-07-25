import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';
import io from 'socket.io-client';

const API_URL = 'http://localhost:5002/api';
const SOCKET_URL = 'http://localhost:5002';

const ChatContext = createContext();

export const useChat = () => {
  return useContext(ChatContext);
};

export const ChatProvider = ({ children }) => {
  const { currentUser, isAuthenticated, token } = useAuth();
  const [messages, setMessages] = useState({});
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  
  // Initialize socket connection
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setIsConnected(false);
      return;
    }
    
    // Connect to Socket.io server with enhanced options
    const newSocket = io(SOCKET_URL, {
      auth: {
        token: localStorage.getItem('token')
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling']
    });
    
    // Set up event listeners
    newSocket.on('connect', () => {
      console.log('Socket connected!', newSocket.id);
      setIsConnected(true);
      reconnectAttempts.current = 0;
    });
    
    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      
      // If the server forcefully disconnected, try to reconnect manually
      if (reason === 'io server disconnect') {
        // The server has forcibly closed the connection
        console.log('Server disconnected the socket - attempting reconnect');
        setTimeout(() => {
          if (socketRef.current === newSocket) {
            newSocket.connect();
          }
        }, 1000);
      }
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      reconnectAttempts.current++;
      
      if (reconnectAttempts.current > maxReconnectAttempts) {
        console.error('Max reconnection attempts reached, giving up');
        newSocket.disconnect();
      }
    });
    
    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setIsConnected(false);
    });
    
    // Handle incoming messages
    newSocket.on('new_message', (messageData) => {
      setMessages(prev => {
        const topicId = messageData.topicId;
        const topicMessages = [...(prev[topicId] || [])];
        
        // Check if message already exists to avoid duplicates
        const existingMsgIndex = topicMessages.findIndex(m => m._id === messageData._id);
        
        if (existingMsgIndex >= 0) {
          // Update existing message (e.g., delivered/read status)
          topicMessages[existingMsgIndex] = messageData;
        } else {
          // Add new message
          topicMessages.push(messageData);
          
          // Sort by timestamp
          topicMessages.sort((a, b) => 
            new Date(a.createdAt) - new Date(b.createdAt)
          );
          
          // Update topic unread count if this is not the selected topic
          if (topicId !== selectedTopic) {
            setTopics(prevTopics => 
              prevTopics.map(topic => 
                topic._id === topicId 
                  ? { ...topic, unread: (topic.unread || 0) + 1 } 
                  : topic
              )
            );
          }
        }
        
        return {
          ...prev,
          [topicId]: topicMessages
        };
      });
    });
    
    // Handle reactions
    newSocket.on('message_reaction', (reactionData) => {
      setMessages(prev => {
        const { topicId, messageId, reaction } = reactionData;
        const topicMessages = [...(prev[topicId] || [])];
        
        const msgIndex = topicMessages.findIndex(m => m._id === messageId);
        
        if (msgIndex >= 0) {
          const updatedMessage = { 
            ...topicMessages[msgIndex],
            reactions: reaction.remove 
              ? // Remove the reaction
                topicMessages[msgIndex].reactions.filter(r => 
                  !(r.user === reaction.userId && r.reaction === reaction.emoji)
                )
              : // Add the reaction
                [...(topicMessages[msgIndex].reactions || []), {
                  user: reaction.userId,
                  reaction: reaction.emoji
                }]
          };
          
          topicMessages[msgIndex] = updatedMessage;
          
          return {
            ...prev,
            [topicId]: topicMessages
          };
        }
        
        return prev;
      });
    });
    
    // Store the socket reference
    socketRef.current = newSocket;
    
    // Fetch initial data
    loadInitialData();
    
    // Ping mechanism to keep the connection alive
    const pingInterval = setInterval(() => {
      if (newSocket && newSocket.connected) {
        console.log('Sending ping to keep socket connection alive');
        newSocket.emit('ping');
      }
    }, 30000); // 30 seconds
    
    // Clean up on unmount
    return () => {
      clearInterval(pingInterval);
      if (newSocket) {
        console.log('Cleaning up socket connection');
        newSocket.disconnect();
      }
    };
  }, [currentUser, isAuthenticated]);
  
  // Load chats and messages
  const loadInitialData = async () => {
    if (!isAuthenticated || !currentUser) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Get user's chat topics
      const topicsResponse = await axios.get(`${API_URL}/messages/topics`);
      setTopics(topicsResponse.data);
      
      // If there are topics, select the first one and load its messages
      if (topicsResponse.data.length > 0) {
        const firstTopic = topicsResponse.data[0];
        setSelectedTopic(firstTopic._id);
        
        // Get messages for the first topic
        await loadTopicMessages(firstTopic._id);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading chat data:', err);
      setLoading(false);
    }
  };
  
  // Load messages for a specific topic
  const loadTopicMessages = async (topicId) => {
    if (!topicId) return;
    
    try {
      const messagesResponse = await axios.get(`${API_URL}/messages?${
        topicId.startsWith('user_') ? `receiverId=${topicId.slice(5)}` : `group=${topicId}`
      }`);
      
      // Update messages state
      setMessages(prev => ({
        ...prev,
        [topicId]: messagesResponse.data
      }));
      
      // Mark topic as read
      markTopicAsRead(topicId);
      
      return messagesResponse.data;
    } catch (err) {
      console.error(`Error loading messages for topic ${topicId}:`, err);
      return [];
    }
  };
  
  // Send a message
  const sendMessage = useCallback(async (text, file = null, topicId = selectedTopic) => {
    if (!isAuthenticated || !currentUser || !topicId) {
      console.error('Cannot send message: User not authenticated or no topic selected');
      return false;
    }
    
    if (!text.trim() && !file) {
      return false;
    }
    
    try {
      // Prepare message data
      const messageData = {
        content: text.trim(),
        attachment: file ? {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileContent: await fileToBase64(file)
        } : null
      };
      
      // Determine if this is a user-to-user or group message
      if (topicId.startsWith('user_')) {
        messageData.receiver = topicId.slice(5); // Remove 'user_' prefix
      } else {
        messageData.group = topicId;
      }
      
      // Send to API
      const response = await axios.post(`${API_URL}/messages`, messageData);
      
      // The message should be emitted back through socket.io, but we can update the UI optimistically
      const newMessage = response.data;
      setMessages(prev => {
        const topicMessages = [...(prev[topicId] || [])];
        topicMessages.push(newMessage);
        
        // Sort by timestamp
        topicMessages.sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        );
        
        return {
          ...prev,
          [topicId]: topicMessages
        };
      });
      
      return true;
    } catch (err) {
      console.error('Error sending message:', err);
      return false;
    }
  }, [currentUser, isAuthenticated, selectedTopic]);
  
  // Helper to convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };
  
  // Create a new topic (direct message or group)
  const createTopic = useCallback(async (users, name = '', isGroup = false) => {
    if (!isAuthenticated || !currentUser) {
      console.error('Cannot create topic: User not authenticated');
      return false;
    }
    
    try {
      // Create topic through API
      const response = await axios.post(`${API_URL}/messages/topics`, {
        users,
        name,
        isGroup
      });
      
      const newTopic = response.data;
      
      // Update topics state
      setTopics(prev => [newTopic, ...prev]);
      
      // Select the new topic
      setSelectedTopic(newTopic._id);
      
      return newTopic._id;
    } catch (err) {
      console.error('Error creating topic:', err);
      return false;
    }
  }, [currentUser, isAuthenticated]);
  
  // Add a reaction to a message
  const addReaction = useCallback(async (messageId, emoji, topicId = selectedTopic) => {
    if (!isAuthenticated || !currentUser) {
      console.error('Cannot add reaction: User not authenticated');
      return false;
    }
    
    try {
      await axios.post(`${API_URL}/messages/${messageId}/reactions`, {
        reaction: emoji
      });
      
      // Socket will emit an event that updates the UI
      
      return true;
    } catch (err) {
      console.error('Error adding reaction:', err);
      return false;
    }
  }, [currentUser, isAuthenticated, selectedTopic]);
  
  // Remove a reaction from a message
  const removeReaction = useCallback(async (messageId, emoji, topicId = selectedTopic) => {
    if (!isAuthenticated || !currentUser) {
      console.error('Cannot remove reaction: User not authenticated');
      return false;
    }
    
    try {
      await axios.delete(`${API_URL}/messages/${messageId}/reactions/${emoji}`);
      
      // Socket will emit an event that updates the UI
      
      return true;
    } catch (err) {
      console.error('Error removing reaction:', err);
      return false;
    }
  }, [currentUser, isAuthenticated, selectedTopic]);
  
  // Mark a message as read
  const markMessageAsRead = useCallback(async (messageId) => {
    if (!isAuthenticated || !currentUser) return false;
    
    try {
      await axios.patch(`${API_URL}/messages/${messageId}/read`);
      return true;
    } catch (err) {
      console.error('Error marking message as read:', err);
      return false;
    }
  }, [currentUser, isAuthenticated]);
  
  // Mark a topic as read
  const markTopicAsRead = useCallback(async (topicId) => {
    if (!isAuthenticated || !currentUser || !topicId) return false;
    
    try {
      // Update UI optimistically
      setTopics(prevTopics => 
        prevTopics.map(topic => 
          topic._id === topicId ? { ...topic, unread: 0 } : topic
        )
      );
      
      // Call API to mark topic as read
      await axios.patch(`${API_URL}/messages/topics/${topicId}/read`);
      
      return true;
    } catch (err) {
      console.error('Error marking topic as read:', err);
      return false;
    }
  }, [currentUser, isAuthenticated]);
  
  // Handle topic selection
  const selectTopic = useCallback(async (topicId) => {
    setSelectedTopic(topicId);
    
    // Load messages for this topic if not loaded yet
    if (!messages[topicId]) {
      await loadTopicMessages(topicId);
    }
    
    // Mark as read
    await markTopicAsRead(topicId);
  }, [messages, markTopicAsRead]);
  
  // Add reconnect method
  const reconnectSocket = useCallback(() => {
    if (socketRef.current) {
      console.log('Manually reconnecting socket...');
      socketRef.current.connect();
    }
  }, []);
  
  // Provide the context value
  const contextValue = {
    messages,
    topics,
    selectedTopic,
    isConnected,
    loading,
    error,
    sendMessage,
    createTopic,
    addReaction,
    removeReaction,
    selectTopic,
    markTopicAsRead,
    markMessageAsRead,
    reconnectSocket
  };
  
  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext; 