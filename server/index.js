require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const connectDB = require("./config/db");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route (works before DB connection)
app.get("/api/health", (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.json({
    status: "ok",
    message: "Server is running",
    database: dbConnected ? "connected" : "connecting",
    timestamp: new Date().toISOString(),
  });
});

// Initialize server with async DB connection
const initializeServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // API Routes (only register after DB connection)
    app.use("/api/auth", require("./routes/auth"));
    app.use("/api/products", require("./routes/products"));
    app.use("/api/categories", require("./routes/categories"));
    app.use("/api/orders", require("./routes/orders"));
    app.use("/api/messages", require("./routes/messages"));
    app.use("/api/admin", require("./routes/admin"));

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error("[v0] Error:", err.message);
      res.status(err.status || 500).json({
        error: err.message || "Internal server error",
      });
    });

    // Start server
    app.listen(PORT, () => {
      console.log(`[v0] Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("[v0] Failed to initialize server:", error.message);
    process.exit(1);
  }
};

// Start the server
initializeServer();

module.exports = app;
