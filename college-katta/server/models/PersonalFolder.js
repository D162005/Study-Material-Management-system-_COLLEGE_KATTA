import mongoose from 'mongoose';
const { Schema } = mongoose;

const personalFolderSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Folder name is required'],
    trim: true
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
  path: {
    type: String,
    default: '/'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create compound index for efficient folder listing
personalFolderSchema.index({ userId: 1, parentFolder: 1, isDeleted: 1 });

// Ensure folder names are unique within the same parent folder for a user
personalFolderSchema.index(
  { userId: 1, parentFolder: 1, name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// Add method to check if a folder is a child of another folder
personalFolderSchema.methods.isChildOf = async function(potentialParentId) {
  if (!potentialParentId || this.parentFolder === null) {
    return false;
  }
  
  if (this.parentFolder.toString() === potentialParentId.toString()) {
    return true;
  }
  
  // Check parent's parent recursively
  const parent = await this.model('PersonalFolder').findById(this.parentFolder);
  if (!parent) {
    return false;
  }
  
  return await parent.isChildOf(potentialParentId);
};

const PersonalFolder = mongoose.model('PersonalFolder', personalFolderSchema);
export default PersonalFolder; 