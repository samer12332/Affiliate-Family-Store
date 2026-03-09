const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");
const Product = require("../models/Product");
const Category = require("../models/Category");
const AdminUser = require("../models/AdminUser");
const connectDB = require("../config/db");
const { ADMIN_EMAIL } = require("../config/constants");

const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing data
    await Product.deleteMany({});
    await Category.deleteMany({});
    await AdminUser.deleteMany({});

    console.log("[v0] Cleared existing data");

    // Create categories
    const categories = await Category.insertMany([
      {
        name: "Clothes",
        slug: "clothes",
        description: "Men, women, and children clothing",
        seoMetadata: {
          title: "Clothes Collection",
          description: "Browse our collection of high-quality clothes",
          keywords: ["clothes", "fashion", "apparel"],
        },
      },
      {
        name: "Shoes",
        slug: "shoes",
        description: "Shoes for all ages and styles",
        seoMetadata: {
          title: "Shoes Collection",
          description: "Discover comfortable and stylish shoes",
          keywords: ["shoes", "footwear", "sneakers"],
        },
      },
      {
        name: "Others",
        slug: "others",
        description: "Accessories and other items",
        seoMetadata: {
          title: "Accessories & More",
          description: "Browse our collection of accessories",
          keywords: ["accessories", "items"],
        },
      },
    ]);

    console.log("[v0] Created 3 categories");

    // Create sample products
    const products = await Product.insertMany([
      {
        name: "Premium Cotton T-Shirt",
        slug: "premium-cotton-tshirt",
        category: "Clothes",
        gender: "Men",
        brand: "FamilyStore",
        description:
          "Comfortable and durable cotton t-shirt perfect for everyday wear. High-quality fabric ensures comfort and longevity.",
        price: 150,
        discountPrice: 120,
        images: [
          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop",
        ],
        colors: [
          { name: "Black", hex: "#000000" },
          { name: "White", hex: "#FFFFFF" },
          { name: "Navy", hex: "#000080" },
        ],
        sizes: ["S", "M", "L", "XL", "XXL"],
        availabilityStatus: "Available",
        sku: "TSHIRT-001",
        featured: true,
        newArrival: true,
        onSale: true,
        tags: ["men", "t-shirt", "casual"],
        supplierInfo: {
          name: "Textile Supplier A",
          reference: "SUP-001",
        },
        seoMetadata: {
          title: "Premium Cotton T-Shirt for Men",
          description:
            "High-quality cotton t-shirt for comfortable everyday wear",
          keywords: ["t-shirt", "men", "cotton"],
        },
        shippingOptions: [
          { governorate: "Cairo", fee: 50, estimatedDays: 1 },
          { governorate: "Giza", fee: 50, estimatedDays: 1 },
          { governorate: "Alexandria", fee: 75, estimatedDays: 2 },
          { governorate: "Aswan", fee: 100, estimatedDays: 3 },
        ],
      },
      {
        name: "Classic Denim Jeans",
        slug: "classic-denim-jeans",
        category: "Clothes",
        gender: "Women",
        brand: "FamilyStore",
        description:
          "Timeless denim jeans with a perfect fit. Made from high-quality denim fabric.",
        price: 300,
        discountPrice: 250,
        images: [
          "https://images.unsplash.com/photo-1542272604-787c62d465d1?w=500&h=500&fit=crop",
        ],
        colors: [
          { name: "Dark Blue", hex: "#003366" },
          { name: "Light Blue", hex: "#6699CC" },
          { name: "Black", hex: "#000000" },
        ],
        sizes: ["XS", "S", "M", "L", "XL"],
        availabilityStatus: "Available",
        sku: "JEANS-001",
        featured: true,
        newArrival: false,
        onSale: false,
        tags: ["women", "jeans", "denim"],
        supplierInfo: {
          name: "Textile Supplier B",
          reference: "SUP-002",
        },
        seoMetadata: {
          title: "Classic Denim Jeans for Women",
          description: "Stylish and comfortable denim jeans",
          keywords: ["jeans", "women", "denim"],
        },
        shippingOptions: [
          { governorate: "Cairo", fee: 50, estimatedDays: 1 },
          { governorate: "Giza", fee: 50, estimatedDays: 1 },
          { governorate: "Alexandria", fee: 75, estimatedDays: 2 },
        ],
      },
      {
        name: "Casual Running Shoes",
        slug: "casual-running-shoes",
        category: "Shoes",
        gender: "Unisex",
        brand: "FamilyStore",
        description:
          "Comfortable and stylish running shoes suitable for all activities. Lightweight and breathable.",
        price: 450,
        discountPrice: null,
        images: [
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop",
        ],
        colors: [
          { name: "White", hex: "#FFFFFF" },
          { name: "Black", hex: "#000000" },
          { name: "Gray", hex: "#808080" },
        ],
        sizes: ["6", "7", "8", "9", "10", "11", "12"],
        availabilityStatus: "Limited Availability",
        sku: "SHOES-001",
        featured: true,
        newArrival: true,
        onSale: false,
        tags: ["shoes", "running", "unisex"],
        supplierInfo: {
          name: "Footwear Supplier C",
          reference: "SUP-003",
        },
        seoMetadata: {
          title: "Casual Running Shoes",
          description: "Lightweight and comfortable running shoes",
          keywords: ["shoes", "running", "casual"],
        },
        shippingOptions: [
          { governorate: "Cairo", fee: 60, estimatedDays: 1 },
          { governorate: "Giza", fee: 60, estimatedDays: 1 },
          { governorate: "Alexandria", fee: 85, estimatedDays: 2 },
        ],
      },
      {
        name: "Children's T-Shirt",
        slug: "childrens-tshirt",
        category: "Clothes",
        gender: "Children",
        brand: "FamilyStore",
        description: "Cute and colorful t-shirt designed for children. Soft fabric for comfort.",
        price: 100,
        discountPrice: 80,
        images: [
          "https://images.unsplash.com/photo-1578932750294-708ee3e7b716?w=500&h=500&fit=crop",
        ],
        colors: [
          { name: "Red", hex: "#FF0000" },
          { name: "Blue", hex: "#0000FF" },
          { name: "Yellow", hex: "#FFFF00" },
        ],
        sizes: ["2Y", "3Y", "4Y", "5Y", "6Y", "7Y", "8Y"],
        availabilityStatus: "Available",
        sku: "KIDS-001",
        featured: false,
        newArrival: true,
        onSale: true,
        tags: ["children", "t-shirt", "kids"],
        supplierInfo: {
          name: "Kids Supplier D",
          reference: "SUP-004",
        },
        seoMetadata: {
          title: "Children's T-Shirt",
          description: "Colorful and comfortable t-shirt for kids",
          keywords: ["kids", "t-shirt", "children"],
        },
        shippingOptions: [
          { governorate: "Cairo", fee: 40, estimatedDays: 1 },
          { governorate: "Giza", fee: 40, estimatedDays: 1 },
          { governorate: "Alexandria", fee: 65, estimatedDays: 2 },
        ],
      },
    ]);

    console.log("[v0] Created 4 sample products");

    // Create admin user
    const hashedPassword = await bcryptjs.hash("AdminPass123!", 10);
    await AdminUser.create({
      email: ADMIN_EMAIL,
      hashedPassword,
      role: "admin",
      isActive: true,
    });

    console.log(`[v0] Created admin user: ${ADMIN_EMAIL}`);
    console.log("[v0] Database seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("[v0] Seeding error:", error);
    process.exit(1);
  }
};

seedDatabase();
