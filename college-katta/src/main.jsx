import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { FileProvider } from './context/FileContext'
import { AuthProvider } from './context/AuthContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <FileProvider>
        <App />
      </FileProvider>
    </AuthProvider>
  </React.StrictMode>,
)
