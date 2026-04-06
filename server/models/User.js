const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    // 🔐 Auth
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    // 🏷 Role & Permissions
    role: {
      type: String,
      enum: ["admin", "auditor", "staff", "customer", "credit_officer"],
      default: "customer",
    },
    // 📱 Profile
    phone: { type: String },
    avatar: { type: String },

    // 🪪 KYC (optional but important)
    nationalId: String,
    address: {
      street: String,
      city: String,
      country: { type: String, default: "Cambodia" },
    },

    // � Credit & Loans
    creditScore: { type: Number, default: 650 },    balance: { type: Number, default: 0 },
    // �🔒 Security Features
    isVerified: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },

    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },

    passwordChangedAt: Date,

    // 🔑 Reset Password
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // 🕒 Activity
    lastLogin: Date,
  },
  { timestamps: true },
);

// ==============================
// 🔐 PASSWORD HASHING
// ==============================
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  this.passwordChangedAt = Date.now();
});

// ==============================
// 🔑 COMPARE PASSWORD
// ==============================
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ==============================
// 🔐 JWT TOKEN GENERATION
// ==============================
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
};

// ==============================
// 🚫 LOGIN ATTEMPTS / LOCK SYSTEM
// ==============================
userSchema.methods.incLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil > Date.now()) {
    return;
  }

  this.loginAttempts += 1;

  // lock after 5 failed attempts
  if (this.loginAttempts >= 5) {
    this.isLocked = true;
    this.lockUntil = Date.now() + 15 * 60 * 1000; // 15 min
  }

  await this.save();
};

// ==============================
// 🔓 RESET LOGIN ATTEMPTS
// ==============================
userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.isLocked = false;
  this.lockUntil = null;
  await this.save();
};

// ==============================
// 🔐 CHECK IF PASSWORD CHANGED
// ==============================
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTime = parseInt(this.passwordChangedAt.getTime() / 1000, 10);

    return JWTTimestamp < changedTime;
  }

  return false;
};

module.exports = mongoose.model("User", userSchema);
