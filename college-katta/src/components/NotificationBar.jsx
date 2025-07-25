import React, { useState, useEffect } from 'react';
import { useStudyMaterial } from '../context/StudyMaterialContext';

const NotificationBar = () => {
  const { isUsingLocalStorage } = useStudyMaterial();
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    if (isUsingLocalStorage) {
      setVisible(true);
    }
  }, [isUsingLocalStorage]);
  
  const closeNotification = () => {
    setVisible(false);
  };
  
  if (!visible) return null;
  
  return (
    <div className="notification-bar" style={{
      backgroundColor: '#fff3cd',
      color: '#856404',
      padding: '10px 15px',
      borderRadius: '4px',
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      border: '1px solid #ffeeba'
    }}>
      <div>
        <strong>Local Storage Mode Active</strong>
        <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
          The app is currently using your browser's local storage instead of MongoDB. 
          Uploaded materials will be stored locally and will not persist between different browsers or devices.
        </p>
      </div>
      <button 
        onClick={closeNotification}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '20px',
          color: '#856404',
          padding: '0 5px'
        }}
      >
        &times;
      </button>
    </div>
  );
};

export default NotificationBar; 