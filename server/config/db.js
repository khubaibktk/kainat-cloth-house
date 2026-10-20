const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI?.trim();

  try {
    if (!uri || !/^mongodb(\+srv)?:\/\//.test(uri)) {
      throw new Error("MONGO_URI is missing or has an invalid prefix.");
    }

    await mongoose.connect(uri);
    console.log("MongoDB connected successfully.");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;