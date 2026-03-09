const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const { verifyAdminToken } = require("../middleware/auth");

// Get all messages with pagination, search, and filtering (admin only)
router.get("/", verifyAdminToken, async (req, res) => {
  try {
    const { type, search, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (type && (type === "contact" || type === "productInquiry")) {
      filter.type = type;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Message.countDocuments(filter);

    res.json({
      messages,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[v0] Error fetching messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get message by ID (admin only)
router.get("/:id", verifyAdminToken, async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    res.json(message);
  } catch (error) {
    console.error("[v0] Error fetching message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create message (public)
router.post("/", async (req, res) => {
  try {
    const { type, name, email, phone, message, productId } = req.body;

    // Validate required fields
    if (!type || !name || !email || !message) {
      return res.status(400).json({
        error: "Type, name, email, and message are required",
      });
    }

    if (type !== "contact" && type !== "productInquiry") {
      return res.status(400).json({
        error: "Invalid message type",
      });
    }

    const newMessage = new Message({
      type,
      name,
      email,
      phone: phone || "",
      message,
      productId: type === "productInquiry" ? productId : undefined,
    });

    const savedMessage = await newMessage.save();

    res.status(201).json({
      message: savedMessage,
      success: "Message sent successfully",
    });
  } catch (error) {
    console.error("[v0] Error creating message:", error);
    res.status(400).json({ error: error.message });
  }
});

// Delete message (admin only)
router.delete("/:id", verifyAdminToken, async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("[v0] Error deleting message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
