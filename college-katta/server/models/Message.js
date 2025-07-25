import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isGroupMessage: {
    type: Boolean,
    default: false
  },
  group: {
    type: String
  },
  attachmentUrl: {
    type: String
  },
  attachmentType: {
    type: String
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry']
    }
  }]
}, { timestamps: true });

const Message = mongoose.model('Message', MessageSchema);

export default Message; 