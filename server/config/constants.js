// Shared backend constants (mirror of frontend constants)

const EGYPTIAN_GOVERNORATES = [
  "Cairo",
  "Giza",
  "Alexandria",
  "Aswan",
  "Asyut",
  "Beheira",
  "Beni Suef",
  "Dakahlia",
  "Damietta",
  "Fayoum",
  "Gharbia",
  "Ismailia",
  "Kafr El-Sheikh",
  "Matruh",
  "Minya",
  "Monufia",
  "New Cairo",
  "North Sinai",
  "Port Said",
  "Qalyubia",
  "Qena",
  "Red Sea",
  "Sohag",
  "South Sinai",
];

const PRODUCT_CATEGORIES = ["Clothes", "Shoes", "Others"];

const GENDER_TYPES = ["Men", "Women", "Children", "Unisex"];

const AVAILABILITY_STATUS = [
  "Available",
  "Limited Availability",
  "Temporarily Unavailable",
];

const ORDER_STATUSES = [
  "Pending Review",
  "Confirmed with Customer",
  "Sent to Supplier",
  "Supplier Confirmed",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

const MESSAGE_TYPES = ["contact", "productInquiry"];

const ADMIN_EMAIL = "admin@familystore.local";

module.exports = {
  EGYPTIAN_GOVERNORATES,
  PRODUCT_CATEGORIES,
  GENDER_TYPES,
  AVAILABILITY_STATUS,
  ORDER_STATUSES,
  MESSAGE_TYPES,
  ADMIN_EMAIL,
};
