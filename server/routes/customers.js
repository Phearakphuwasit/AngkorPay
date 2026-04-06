const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { protect } = require("../middleware/auth");

console.log("✅ Loading customers routes...");

// GET all customers (admin only)
router.get("/", protect(["admin"]), async (req, res) => {
  try {
    const customers = await User.find({ role: "customer" }).select(
      "_id name email phone status creditScore nationalId address",
    );

    // Map to match your frontend structure
    const mapped = customers.map((c) => ({
      _id: c._id,
      firstName: c.name.split(" ")[0],
      lastName: c.name.split(" ")[1] || "",
      email: c.email,
      phone: c.phone,
      status: c.isLocked ? "suspended" : "active",
      creditScore: c.creditScore || 0,
      nationalId: c.nationalId || "",
      address: c.address?.street || "",
    }));

    res.json(mapped);
  } catch (err) {
    console.error("Fetch customers error:", err);
    res.status(500).json({ message: "Failed to load customers" });
  }
});

// POST - Create a new customer (admin only)
router.post("/", protect(["admin"]), async (req, res) => {
  try {
    const { firstName, lastName, email, phone, nationalId, address } = req.body;

    // Validation
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ message: "First name, last name, and email are required" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create new customer
    const newUser = new User({
      name: `${firstName} ${lastName}`,
      email,
      phone: phone || "",
      nationalId: nationalId || "",
      address: { street: address || "", country: "Cambodia" },
      password: hashedPassword,
      role: "customer",
    });

    await newUser.save();

    res.status(201).json({
      message: "Customer created successfully",
      _id: newUser._id,
      firstName: newUser.name.split(" ")[0],
      lastName: newUser.name.split(" ")[1] || "",
      email: newUser.email,
      phone: newUser.phone,
      status: "active",
      creditScore: 0,
      nationalId: newUser.nationalId || "",
      address: newUser.address?.street || "",
    });
  } catch (err) {
    console.error("Create customer error:", err);
    res.status(500).json({ message: "Failed to create customer" });
  }
});

// DELETE a customer (admin only)
router.delete("/:id", protect(["admin"]), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Customer deleted" });
  } catch (err) {
    console.error("Delete customer error:", err);
    res.status(500).json({ message: "Failed to delete customer" });
  }
});

module.exports = router;
