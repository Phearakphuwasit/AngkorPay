const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "closed"],
      default: "active",
    },
    creditScore: {
      type: Number,
      required: true,
      min: 300,
      max: 850,
      default: 600,
    },
    balance: {
      type: Number,
      default: 0, // sum of outstanding loans
    },
    totalLoans: {
      type: Number,
      default: 0, // calculated from Loan collection
    },
    loans: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Loan",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to update totalLoans and balance
CustomerSchema.pre("save", async function (next) {
  const Loan = mongoose.model("Loan");
  const loans = await Loan.find({ customer: this._id, status: { $ne: "Rejected" } });
  this.totalLoans = loans.length;
  this.balance = loans.reduce((sum, l) => sum + l.principal, 0);
  next();
});

const Customer = mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);
module.exports = Customer;