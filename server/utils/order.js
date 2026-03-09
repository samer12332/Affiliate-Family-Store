const Order = require("../models/Order");

// Generate human-friendly order number: FAM-YYYYMMDD-001
const generateOrderNumber = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dateString = `${year}${month}${day}`;

  // Find the count of orders created today
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );

  const ordersToday = await Order.countDocuments({
    createdAt: { $gte: startOfDay, $lt: endOfDay },
  });

  const sequence = String(ordersToday + 1).padStart(3, "0");
  return `FAM-${dateString}-${sequence}`;
};

module.exports = {
  generateOrderNumber,
};
