const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const { verifyAdminToken } = require("../middleware/auth");
const { generateOrderNumber } = require("../utils/order");
const { EGYPTIAN_GOVERNORATES } = require("../config/constants");

// Get all orders with pagination, search, and filtering (admin only)
router.get("/admin", verifyAdminToken, async (req, res) => {
  try {
    const { status, governorate, search, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (governorate) filter["shippingAddress.governorate"] = governorate;

    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { customerEmail: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[v0] Error fetching orders:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get order by ID (admin only)
router.get("/admin/:id", verifyAdminToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    console.error("[v0] Error fetching order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create order (public)
router.post("/", async (req, res) => {
  try {
    const { items, customerName, customerEmail, customerPhone, shippingAddress } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items are required" });
    }

    if (!customerName || !customerEmail || !customerPhone) {
      return res.status(400).json({ error: "Customer details are required" });
    }

    if (!shippingAddress || !shippingAddress.governorate) {
      return res.status(400).json({ error: "Shipping address with governorate is required" });
    }

    // Validate governorate
    if (!EGYPTIAN_GOVERNORATES.includes(shippingAddress.governorate)) {
      return res.status(400).json({ error: "Invalid governorate" });
    }

    // Validate items and create snapshots
    let subtotal = 0;
    let totalShippingFee = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({ error: `Product not found: ${item.productId}` });
      }

      // Find shipping fee for this governorate
      const shippingOption = product.shippingOptions?.find(
        (opt) => opt.governorate === shippingAddress.governorate
      );

      if (!shippingOption) {
        return res.status(400).json({
          error: `Shipping not available for ${product.name} to ${shippingAddress.governorate}`,
        });
      }

      // Create item snapshot
      const orderItem = {
        productId: product._id,
        productName: product.name,
        productSlug: product.slug,
        selectedColor: item.selectedColor,
        selectedSize: item.selectedSize,
        quantity: item.quantity,
        unitPrice: product.discountPrice || product.price,
        productImage: product.images?.[0] || "",
        shippingFee: shippingOption.fee,
        supplierReference: product.supplierInfo?.reference,
        returnEligibility: true, // Can be based on product type
      };

      orderItems.push(orderItem);
      subtotal += orderItem.unitPrice * orderItem.quantity;
      totalShippingFee += orderItem.shippingFee;
    }

    // Generate order number
    const orderNumber = await generateOrderNumber();

    // Create order
    const order = new Order({
      orderNumber,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      items: orderItems,
      subtotal,
      totalShippingFee,
      totalPrice: subtotal + totalShippingFee,
      status: "Pending Review",
    });

    const savedOrder = await order.save();

    res.status(201).json({
      order: savedOrder,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("[v0] Error creating order:", error);
    res.status(400).json({ error: error.message });
  }
});

// Update order status (admin only)
router.put("/:id", verifyAdminToken, async (req, res) => {
  try {
    const { status, supplierNotes, internalNotes } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (supplierNotes !== undefined) updateData.supplierNotes = supplierNotes;
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    console.error("[v0] Error updating order:", error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
