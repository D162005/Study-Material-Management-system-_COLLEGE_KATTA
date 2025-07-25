import mongoose from 'mongoose';
const { Schema } = mongoose;

const personalFileSchema = new Schema({
  name: {
    type: String,
    required: [true, 'File name is required'],
    trim: true
  },
  title: {
    type: String,
    trim: true
  },
  subject: {
    type: String,
    trim: true,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  fileType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  downloads: {
    type: Number,
    default: 0
  },
  materialType: {
    type: String,
    enum: ['NOTES', 'ASSIGNMENT', 'QUESTION_PAPER', 'SYLLABUS', 'OTHER'],
    default: 'OTHER'
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  parentFolder: {
    type: Schema.Types.ObjectId,
    ref: 'PersonalFolder',
    default: null,
    index: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create compound index for efficient file listing
personalFileSchema.index({ userId: 1, parentFolder: 1, isDeleted: 1 });

// Ensure file names are unique within the same folder for a user
personalFileSchema.index(
  { userId: 1, parentFolder: 1, name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

const PersonalFile = mongoose.model('PersonalFile', personalFileSchema);
export default PersonalFile; 