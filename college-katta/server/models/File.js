import mongoose from 'mongoose';

const FileSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  filename: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileContent: {
    type: String,
    required: true
  },
  branch: {
    type: String,
    required: true
  },
  year: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Notes', 'Question Paper (PYQ)', 'Lab Manual', 'Project'],
    default: 'Notes'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bookmarkedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create compound index for common query patterns
FileSchema.index({ status: 1, createdAt: -1 });
FileSchema.index({ uploadedBy: 1, createdAt: -1 });
FileSchema.index({ status: 1, branch: 1, year: 1, subject: 1, type: 1 });
FileSchema.index({ bookmarkedBy: 1, status: 1, createdAt: -1 });

// Create text index for search functionality
FileSchema.index(
  { 
    title: 'text', 
    description: 'text', 
    subject: 'text' 
  },
  {
    weights: {
      title: 3,
      subject: 2,
      description: 1
    }
  }
);

const File = mongoose.model('File', FileSchema);

export default File; 