const { verifyToken } = require("../utils/auth");
const AdminUser = require("../models/AdminUser");

// Middleware to verify admin token
const verifyAdminToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "No token provided",
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        error: "Invalid or expired token",
      });
    }

    // Verify that admin user still exists and is active
    const adminUser = await AdminUser.findById(decoded.id);
    if (!adminUser || !adminUser.isActive) {
      return res.status(401).json({
        error: "User not found or inactive",
      });
    }

    req.admin = {
      id: adminUser._id,
      email: adminUser.email,
      role: adminUser.role,
    };

    next();
  } catch (error) {
    console.error("[v0] Auth middleware error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  verifyAdminToken,
};
