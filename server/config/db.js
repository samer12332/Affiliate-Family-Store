const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/familystore";
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`[v0] MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[v0] MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
