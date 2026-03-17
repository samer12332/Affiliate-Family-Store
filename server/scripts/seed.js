const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");
require("dotenv").config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/familystore";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true },
    password: String,
    role: String,
    isProtected: Boolean,
    active: Boolean,
    merchantProfile: {
      storeName: String,
      slug: String,
      phone: String,
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

async function run() {
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });

  const email = "sameryousry99@gmail.com";
  const password = "samer99yousry";
  const existing = await User.findOne({ email });

  if (existing) {
    existing.name = "Samer Yousry";
    existing.role = "owner";
    existing.isProtected = true;
    existing.active = true;
    existing.password = await bcryptjs.hash(password, 10);
    await existing.save();
    console.log("Protected owner account refreshed.");
  } else {
    await User.create({
      name: "Samer Yousry",
      email,
      password: await bcryptjs.hash(password, 10),
      role: "owner",
      isProtected: true,
      active: true,
      merchantProfile: {
        storeName: "Samer Yousry",
        slug: "samer-owner",
      },
    });
    console.log("Protected owner account seeded.");
  }

  await mongoose.disconnect();
}

run().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
