const mongoose = require("mongoose");

// 📌 Payment Schema
const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    paidAt: { type: Date, default: Date.now },
    method: {
      type: String,
      enum: ["cash", "bank", "online"],
      default: "cash",
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: false },
);

// 📅 Schedule Schema (IMPORTANT 🔥)
const scheduleSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    paid: { type: Boolean, default: false },
    paidAt: Date,
  },
  { _id: true },
);

const loanSchema = new mongoose.Schema(
  {
    // 👤 Customer
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 💰 Loan details
    principal: { type: Number, required: true },
    interestRate: { type: Number, required: true },
    termMonths: { type: Number, required: true },

    totalRepayment: { type: Number },
    outstandingBalance: { type: Number },
    monthlyPayment: { type: Number },

    // 📝 Extra info
    purpose: String,
    notes: String,

    // 📊 Status
    status: {
      type: String,
      enum: [
        "Applied",
        "Under Review",
        "Approved",
        "Rejected",
        "Disbursed",
        "Completed",
        "Defaulted",
      ],
      default: "Applied",
      index: true,
    },

    // 👨‍💼 Staff tracking
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    disbursedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    approvedAt: Date,
    disbursedAt: Date,
    completedAt: Date,

    // 📅 Timeline
    startDate: Date,
    endDate: Date,

    // 🔥 NEW: Structured repayment schedule
    schedule: [scheduleSchema],

    // 💳 Payments
    payments: [paymentSchema],
  },
  { timestamps: true },
);

// ==============================
// 🔧 PRE-SAVE LOGIC
// ==============================
loanSchema.pre("save", function (next) {
  // ✅ Calculate totals
  if (!this.totalRepayment) {
    const interest =
      (this.principal * this.interestRate * this.termMonths) / 100;

    this.totalRepayment = this.principal + interest;
    this.outstandingBalance = this.totalRepayment;
    this.monthlyPayment = this.totalRepayment / this.termMonths;
  }

  // ✅ Generate schedule automatically
  if (this.startDate && (!this.schedule || this.schedule.length === 0)) {
    const schedule = [];

    for (let i = 0; i < this.termMonths; i++) {
      const dueDate = new Date(this.startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      schedule.push({
        date: dueDate,
        amount: this.monthlyPayment,
        paid: false,
      });
    }

    this.schedule = schedule;

    // Set end date
    const end = new Date(this.startDate);
    end.setMonth(end.getMonth() + this.termMonths);
    this.endDate = end;
  }

  next();
});

// ==============================
// 💰 APPLY PAYMENT METHOD
// ==============================
loanSchema.methods.applyPayment = function (amount) {
  this.outstandingBalance -= amount;

  // mark next unpaid schedule as paid
  const nextUnpaid = this.schedule.find((s) => !s.paid);
  if (nextUnpaid) {
    nextUnpaid.paid = true;
    nextUnpaid.paidAt = new Date();
  }

  if (this.outstandingBalance <= 0) {
    this.status = "Completed";
    this.completedAt = new Date();
  }
};

module.exports = mongoose.model("Loan", loanSchema);
