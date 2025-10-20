import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 1,
    });
    console.log("✅ MongoDB connected successfully!");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1); // Stop the app if DB connection fails
  }
};

export default connectDB;
