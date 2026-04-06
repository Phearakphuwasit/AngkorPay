const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    type: {
      type: String,
      enum: ["Credit", "Debit", "Fee", "Interest"],
      required: true,
    },
    amount: { type: Number, required: true },
    reference: { type: String }, // optional transaction id
    description: { type: String },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const Transaction =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
module.exports = Transaction;
