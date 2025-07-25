College-Katta

A study material sharing platform for college students. This application allows students to upload, share, and download study materials like notes, question papers, and project reports.

Features

Upload and share study materials

Admin approval system for uploaded materials

User authentication and authorization

Material search and filtering by branch, year, semester, etc.

Bookmark feature to save favorite materials

Local storage fallback when MongoDB is unavailable

Technology Stack

Frontend: React, React Router, Tailwind CSS

Backend: Node.js, Express.js

Database: MongoDB (with local storage fallback)

Authentication: JWT

Local Storage Fallback

The application includes a fallback mechanism that uses the browser's local storage when MongoDB is unavailable. This ensures the app remains functional even without a database connection.


When the app is in local storage mode:


A notification bar appears at the top of the application

All uploads are stored in the browser's local storage

Admin approvals and rejections are still functional

Data persists between page refreshes but not between different browsers or devices

This mode is particularly useful for development and testing purposes when setting up MongoDB might be challenging.


User Roles

Regular User: Can upload materials, browse approved materials, and bookmark favorites

Admin: Can manage user accounts, approve/reject uploaded materials, and access all system features

Default Admin Account

Email: admin@example.com

Password: adminpassword
