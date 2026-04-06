const mongoose = require("mongoose");

const repaymentScheduleSchema = new mongoose.Schema(
  {
    // 🔗 Loan reference
    loan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Loan",
      required: true,
      index: true,
    },

    // 📅 Installment info
    installmentNumber: {
      type: Number,
      required: true,
    },

    dueDate: {
      type: Date,
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    // 💰 Payment tracking
    paidAmount: {
      type: Number,
      default: 0,
    },

    remainingAmount: {
      type: Number,
    },

    // 📊 Status
    status: {
      type: String,
      enum: ["Pending", "Partial", "Paid", "Overdue"],
      default: "Pending",
      index: true,
    },

    paid: {
      type: Boolean,
      default: false,
    },

    paidAt: Date,

    // 🔗 Link to payments (optional)
    payments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment",
      },
    ],

    // ⚠️ Late handling
    penalty: {
      type: Number,
      default: 0,
    },

    daysLate: {
      type: Number,
      default: 0,
    },

    // 👤 Staff tracking
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // 📝 Notes
    notes: String,
  },
  {
    timestamps: true,
  }
);

// ==============================
// 🔧 PRE-SAVE LOGIC
// ==============================
repaymentScheduleSchema.pre("save", function (next) {
  // Calculate remaining amount
  this.remainingAmount = this.amount - this.paidAmount;

  // Determine status
  if (this.paidAmount === 0) {
    this.status = "Pending";
  } else if (this.paidAmount < this.amount) {
    this.status = "Partial";
  } else {
    this.status = "Paid";
    this.paid = true;
    if (!this.paidAt) this.paidAt = new Date();
  }

  // Check overdue
  if (!this.paid && new Date() > this.dueDate) {
    this.status = "Overdue";

    const diffTime = new Date() - this.dueDate;
    this.daysLate = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  next();
});

// ==============================
// 📈 INDEXES (IMPORTANT)
// ==============================
repaymentScheduleSchema.index({ loan: 1, installmentNumber: 1 });
repaymentScheduleSchema.index({ dueDate: 1, status: 1 });

// ==============================
// 💰 APPLY PAYMENT METHOD
// ==============================
repaymentScheduleSchema.methods.applyPayment = function (amount) {
  this.paidAmount += amount;

  if (this.paidAmount >= this.amount) {
    this.paidAmount = this.amount;
    this.paid = true;
    this.paidAt = new Date();
  }
};

// ==============================

module.exports = mongoose.model(
  "RepaymentSchedule",
  repaymentScheduleSchema
);