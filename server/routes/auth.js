const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");

const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { message: "Too many authentication attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper: send user response without password
const userResponse = (user) => ({
  id: user._id,
  email: user.email,
  name: user.name,
  role: user.role,
  createdAt: user.createdAt,
});

// Helper: set HTTP-only cookie
const setAuthCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// ============================
// User Registration (Public)
// ============================
router.post("/register", [
  authLimiter,
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  body("name").trim().isLength({ min: 2 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const { email, password, name } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashedPassword,
      name,
      role: "customer",
    });

    await user.save();

    // Generate token and set cookie
    const token = user.generateAuthToken();
    setAuthCookie(res, token);

    res.status(201).json({
      message: "Registration successful",
      user: userResponse(user),
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Registration failed" });
  }
});

// ============================
// Admin creates a new customer
// ============================
router.post("/register-admin", protect(["admin"]), [
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  body("name").trim().isLength({ min: 2 }),
  body("role").optional().isIn(["customer", "staff", "auditor", "credit_officer"]),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const { email, password, name, role = "customer" } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashedPassword,
      name,
      role,
    });

    await user.save();

    res.status(201).json({
      message: "User created successfully",
      user: userResponse(user),
    });
  } catch (err) {
    console.error("Admin registration error:", err);
    res.status(500).json({ message: "Failed to create user" });
  }
});

// ============================
// User login
// ============================
router.post("/login", [
  authLimiter,
  body("email").isEmail().normalizeEmail(),
  body("password").exists(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if account is locked
    if (user.isLocked && user.lockUntil > Date.now()) {
      return res.status(423).json({
        message: "Account temporarily locked due to too many failed login attempts"
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Generate token and set cookie
    const token = user.generateAuthToken();
    setAuthCookie(res, token);

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ============================
// Logout
// ============================
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});

// ============================
// Get current user
// ============================
router.get("/me", protect(), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user: userResponse(user) });
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

// ============================
// Update profile
// ============================
router.put("/profile", protect(), async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ message: "Email already in use" });
    }

    user.name = name;
    user.email = email;
    await user.save();

    res.json({ message: "Profile updated successfully", user: userResponse(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================
// Change password
// ============================
router.post("/change-password", protect(), async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;