const express = require("express");
const bcryptjs = require("bcryptjs");
const router = express.Router();
const AdminUser = require("../models/AdminUser");
const { generateToken } = require("../utils/auth");

// Admin login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    // Find admin user
    const adminUser = await AdminUser.findOne({ email: email.toLowerCase() });
    if (!adminUser) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    // Check if user is active
    if (!adminUser.isActive) {
      return res.status(401).json({
        error: "User account is inactive",
      });
    }

    // Verify password
    const isPasswordValid = await bcryptjs.compare(
      password,
      adminUser.hashedPassword
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    // Generate token
    const token = generateToken(adminUser._id);

    res.json({
      token,
      admin: {
        id: adminUser._id,
        email: adminUser.email,
        role: adminUser.role,
      },
    });
  } catch (error) {
    console.error("[v0] Auth error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
