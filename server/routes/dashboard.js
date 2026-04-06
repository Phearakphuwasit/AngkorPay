const express = require("express");
const router = express.Router();
const Loan = require("../models/Loan");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { protect } = require("../middleware/auth");

// GET /api/dashboard/user (user dashboard)
router.get("/user", protect(), async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user profile
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get recent transactions (last 10)
    const recentTransactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("type amount description createdAt status");

    // Get active loans
    const activeLoans = await Loan.find({
      userId,
      status: { $in: ["Approved", "Active"] }
    }).select("principal interestRate term status createdAt");

    // Calculate total loan balance
    const totalLoanBalance = activeLoans.reduce((sum, loan) => sum + loan.principal, 0);

    res.json({
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        balance: user.balance,
        creditScore: user.creditScore,
        nationalId: user.nationalId,
        address: user.address,
        createdAt: user.createdAt,
      },
      balance: user.balance,
      recentTransactions,
      activeLoans,
      totalLoanBalance,
      loanCount: activeLoans.length,
    });
  } catch (err) {
    console.error("User dashboard error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/dashboard (admin only)
router.get("/", protect(["admin"]), async (req, res) => {
  try {
    // Users metrics
    const totalUsers = await User.countDocuments();
    const activeAccounts = await User.countDocuments({ isLocked: false });
    const frozenAccounts = await User.countDocuments({ isLocked: true });

    // Loans metrics
    const totalLoans = await Loan.countDocuments();
    const approvedLoans = await Loan.countDocuments({ status: "Approved" });
    const rejectedLoans = await Loan.countDocuments({ status: "Rejected" });
    const allLoans = await Loan.find();

    // Metrics calculations
    const totalAccountBalance = 0; // replace with your real account balances
    const averageLoanAmount =
      allLoans.length > 0
        ? allLoans.reduce((sum, loan) => sum + loan.principal, 0) / allLoans.length
        : 0;

    res.json({
      totalUsers,
      activeAccounts,
      frozenAccounts,
      totalLoans,
      approvedLoans,
      rejectedLoans,
      totalAccountBalance,
      averageLoanAmount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;