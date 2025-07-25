import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    trim: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, 
{
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add index on createdAt for efficient sorting by latest messages
ChatSchema.index({ createdAt: -1 });

// Make sure sender has all needed fields
ChatSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'sender',
    select: 'username fullName role'
  });
  next();
});

const Chat = mongoose.model('Chat', ChatSchema);

export default Chat; 