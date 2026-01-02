import mongoose from 'mongoose';
import User from './src/models/User.js';
const makeAdmin = async (email) => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find user by email
    const user = await User.findOne({ email: email });
    
    if (!user) {
      console.error('User not found with email:', email);
      process.exit(1);
    }

    console.log('Current user details:');
    console.log('Name:', user.name);
    console.log('Email:', user.email);
    console.log('Current role:', user.role);

    // Update user role to admin
    user.role = 'admin';
    await user.save();

    console.log('User role updated to admin successfully!');
    console.log('New role:', user.role);

  } catch (error) {
    console.error('Error making user admin:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('Please provide an email address');
  console.log('Usage: node makeAdmin.js <email>');
  process.exit(1);
}

makeAdmin(email);