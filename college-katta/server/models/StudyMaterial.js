import mongoose from 'mongoose';

const StudyMaterialSchema = new mongoose.Schema({
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
  courseCode: {
    type: String,
    trim: true
  },
  branch: {
    type: String,
    required: true
  },
  year: {
    type: String,
    required: true
  },
  semester: {
    type: String
  },
  subject: {
    type: String,
    required: true
  },
  materialType: {
    type: String,
    enum: ['Notes', 'Question Paper (PYQ)', 'Lab Manual', 'Project'],
    default: 'Notes'
  },
  tags: [{
    type: String,
    trim: true
  }],
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
  viewCount: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    },
    ratings: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      value: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      date: {
        type: Date,
        default: Date.now
      }
    }]
  }
}, { timestamps: true });

// Add text index for search functionality
StudyMaterialSchema.index({ 
  title: 'text', 
  description: 'text', 
  subject: 'text',
  tags: 'text'
});

const StudyMaterial = mongoose.model('StudyMaterial', StudyMaterialSchema);

export default StudyMaterial; 