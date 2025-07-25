import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

/**
 * Seeds an admin user in the database if one doesn't exist
 */
const seedAdminUser = async () => {
  try {
    console.log('🔍 Checking for existing admin user...');
    
    // Check if admin user already exists
    const adminExists = await User.findOne({ isAdmin: true });
    
    if (adminExists) {
      console.log('✅ Admin user already exists:');
      console.log(`   Username: ${adminExists.username}`);
      console.log(`   Email: ${adminExists.email}`);
      
      // Update the admin password to ensure it's correct
      console.log('🔄 Updating admin password to ensure it works correctly');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      // Update password directly in the database to avoid any hooks
      await mongoose.connection.collection('users').updateOne(
        { _id: adminExists._id },
        { $set: { password: hashedPassword } }
      );
      
      console.log('✅ Admin password updated successfully');
      
      // Verify password works
      const passwordCheck = await bcrypt.compare('admin123', hashedPassword);
      console.log('✅ Password verification:', passwordCheck);
      return;
    }
    
    console.log('⚠️ No admin user found. Creating admin user...');
    
    // Create admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    // Insert directly to avoid any hooks
    await mongoose.connection.collection('users').insertOne({
      username: 'admin',
      email: 'admin@collegekata.com',
      password: hashedPassword,
      fullName: 'System Administrator',
      branch: 'Computer Science',
      year: 'Fourth Year',
      isAdmin: true,
      status: 'active',
      bio: 'System administrator for College-Katta platform',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Admin user created successfully');
    console.log('Username: admin');
    console.log('Email: admin@collegekata.com');
    console.log('Password: admin123');
    
    // Verify password works
    const passwordCheck = await bcrypt.compare('admin123', hashedPassword);
    console.log('✅ Password verification:', passwordCheck);
    
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
  }
};

export default seedAdminUser; 