const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    accountNumber: { type: String, unique: true, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    balance: { type: Number, default: 0 },
    accountType: {
      type: String,
      enum: ["Savings", "Checking", "Business"],
      default: "Savings",
    },
    status: {
      type: String,
      enum: ["Active", "Frozen", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Account", accountSchema);
