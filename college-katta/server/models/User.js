import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  profilePicture: {
    type: String,
    default: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${Math.floor(Math.random() * 100)}.jpg`
  },
  bio: {
    type: String,
    default: '',
    maxlength: 500
  },
  branch: {
    type: String,
    required: true,
    enum: ['Computer Science', 'Computer Engineering', 'Information Technology', 'AI & DS']
  },
  year: {
    type: String,
    required: true,
    enum: ['First Year', 'Second Year', 'Third Year', 'Fourth Year']
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log('Comparing passwords...');
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('Password match result:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
};

// Method to check if user is admin (renamed to avoid conflict with property)
UserSchema.methods.checkIsAdmin = function() {
  return this.isAdmin === true;
};

const User = mongoose.model('User', UserSchema);

export default User; 