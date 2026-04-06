const mongoose = require("mongoose");

const CollateralSchema = new mongoose.Schema(
  {
    loan: { type: mongoose.Schema.Types.ObjectId, ref: "Loan", required: true },
    type: { type: String, required: true }, // e.g., Property, Vehicle, Cash
    value: { type: Number, required: true },
    description: { type: String },
    status: { type: String, enum: ["Pledged", "Released"], default: "Pledged" },
  },
  { timestamps: true },
);

const Collateral =
  mongoose.models.Collateral || mongoose.model("Collateral", CollateralSchema);
module.exports = Collateral;
