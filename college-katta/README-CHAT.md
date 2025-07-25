# College-Katta Chat Feature Documentation

## Overview
The College-Katta application now includes a simple text-only chat discussion feature that allows users to communicate with each other in a public channel. This feature is designed to be simple and accessible to all users, with authentication required only for sending messages.

## Features
- **Text-only Messages**: Simple chat with text-only messages
- **Timestamp Display**: Each message shows when it was sent
- **User Attribution**: Messages display the sender's username
- **Admin Badge**: Admin users have their messages highlighted with an admin badge
- **Authentication**: Viewing is public, but sending messages requires login
- **Responsive Design**: Works on both desktop and mobile devices
- **Real-time Updates**: Messages are periodically refreshed to show new content

## Technical Implementation

### Database Model
The chat feature uses a MongoDB collection called 'chat' with the following schema:
- `message`: String (required) - The text content of the message
- `sender`: ObjectId (required) - Reference to the User model, identifies who sent the message
- `createdAt`: Date - Automatically tracks when the message was created

### API Endpoints
- `GET /api/chat` - Retrieves chat messages (most recent first, limited to 100)
- `POST /api/chat` - Sends a new message (requires authentication)

### Frontend Components
- `GeneralChatContext.jsx` - Manages state and API calls for the chat feature
- `GeneralChat.jsx` - Renders the chat UI, input form, and message list

## How to Use
1. **View Messages**: Navigate to the "General Chat" page via the sidebar or header navigation
2. **Send Messages**: 
   - Log in to your account
   - Type your message in the input field at the bottom of the chat
   - Click the send button or press Enter

## Future Enhancements
Potential future enhancements for the chat feature:
- Message deletion (by admins or the message owner)
- Real-time updates using websockets instead of polling
- Private messaging between users
- Rich text formatting

## Implementation Notes
- The chat is intentionally kept simple with text-only messages
- Authentication is handled through the existing AuthContext
- Message timestamps are displayed in a relative format (e.g., "2 minutes ago")
- The chat is accessible to all users but requires authentication to send messages
