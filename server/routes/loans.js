const express = require("express");
const Loan = require("../models/Loan");
const User = require("../models/User");
const LoanRepaymentSchedule = require("../models/LoanRepaymentSchedule");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Helper: validate loan body
function validateLoanPayload(payload) {
  const { customerId, amount, interestRate, termMonths } = payload;
  if (!customerId || !amount || !interestRate || !termMonths) {
    return "customerId, amount, interestRate, and termMonths are required";
  }
  if (amount <= 0) return "amount must be greater than 0";
  if (interestRate <= 0) return "interestRate must be greater than 0";
  if (!Number.isInteger(termMonths) || termMonths <= 0)
    return "termMonths must be a positive integer";
  return null;
}

//================================================ List all loans ================================================
router.get("/", protect(), async (req, res) => {
  try {
    const loans = await Loan.find()
      .populate("customer", "name email role")
      .populate("reviewedBy", "name email");
    res.json(loans);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to get loans", error: err.message });
  }
});

// Get one loan by id
router.get("/:id", protect(), async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate("customer", "name email role")
      .populate("reviewedBy", "name email");
    if (!loan) return res.status(404).json({ message: "Loan not found" });
    res.json(loan);
  } catch (err) {
    res.status(500).json({ message: "Failed to get loan", error: err.message });
  }
});

//================================================ Create loan request ================================================
router.post("/", protect(), async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const error = validateLoanPayload(req.body);
    if (error) return res.status(400).json({ message: error });

    const customer = await User.findById(req.body.customerId);
    if (!customer)
      return res.status(404).json({ message: "Customer not found" });

    const loan = await Loan.create({
      customer: customer._id,
      amount: req.body.amount,
      interestRate: req.body.interestRate,
      termMonths: req.body.termMonths,
      status: "Applied",
      reviewedBy: null,
    });
    res.status(201).json(loan);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to create loan", error: err.message });
  }
});

//================================================ Update existing loan (editable only in Applied or Under Review) ================================================
router.put("/:id", protect(["admin", "auditor"]), async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    if (loan.status === "Approved" || loan.status === "Rejected") {
      return res
        .status(400)
        .json({ message: "Cannot edit approved/rejected loan" });
    }

    const update = {};
    if (req.body.amount) update.amount = req.body.amount;
    if (req.body.interestRate) update.interestRate = req.body.interestRate;
    if (req.body.termMonths) update.termMonths = req.body.termMonths;

    const error = validateLoanPayload({
      customerId: loan.customer,
      amount: update.amount || loan.amount,
      interestRate: update.interestRate || loan.interestRate,
      termMonths: update.termMonths || loan.termMonths,
    });
    if (error) return res.status(400).json({ message: error });

    Object.assign(loan, update);
    await loan.save();

    res.json(loan);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update loan", error: err.message });
  }
});

//================================================ Delete loan ================================================
router.delete("/:id", protect(["admin"]), async (req, res) => {
  try {
    const loan = await Loan.findByIdAndDelete(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });
    res.json({ message: "Loan deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete loan", error: err.message });
  }
});

//================================================ Approve loan ================================================
router.post("/:id/approve", protect(["admin"]), async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });
    if (loan.status === "Approved")
      return res.status(400).json({ message: "Loan already approved" });
    if (loan.status === "Rejected")
      return res.status(400).json({ message: "Loan already rejected" });

    loan.status = "Approved";
    loan.reviewedBy = req.user.id;
    await loan.save();

    res.json(loan);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to approve loan", error: err.message });
  }
});

//================================================ Reject loan ================================================
router.post("/:id/reject", protect(["admin", "auditor"]), async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });
    if (loan.status === "Approved")
      return res.status(400).json({ message: "Loan already approved" });
    if (loan.status === "Rejected")
      return res.status(400).json({ message: "Loan already rejected" });

    loan.status = "Rejected";
    loan.reviewedBy = req.user.id;
    await loan.save();

    res.json(loan);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to reject loan", error: err.message });
  }
});

//================================================ Get loan collection timetable (admin only) ================================================
const RepaymentSchedule = require("../models/LoanRepaymentSchedule");

router.get("/collections/timetable", async (req, res) => {
  console.log("📅 Collections timetable query:", req.query);

  try {
    const { month, year } = req.query;

    const targetMonth =
      month !== undefined ? parseInt(month) : new Date().getMonth();
    const targetYear =
      year !== undefined ? parseInt(year) : new Date().getFullYear();

    const activeLoans = await Loan.find({
      status: { $in: ["Approved", "Disbursed"] },
    }).populate("customer", "name email");

    const collections = [];

    for (const loan of activeLoans) {
      const monthlyPayment =
        loan.monthlyPayment || loan.totalRepayment / loan.termMonths;

      // 🔥 GET schedules
      let schedules = await LoanRepaymentSchedule.find({ loan: loan._id });

      // 🧠 fallback (generate but DO NOT mix types)
      if (schedules.length === 0) {
        const startDate = loan.startDate || loan.disbursedAt || loan.createdAt;

        schedules = Array.from({ length: loan.termMonths }, (_, i) => {
          const dueDate = new Date(startDate);
          dueDate.setMonth(dueDate.getMonth() + i);

          return {
            dueDate,
            amount: monthlyPayment,
            paid: false,
          };
        });
      }

      // ✅ SAFE filtering
      const monthlySchedules = schedules.filter((schedule) => {
        if (!schedule || !schedule.dueDate) return false;

        const d = new Date(schedule.dueDate);

        return (
          !isNaN(d.getTime()) &&
          d.getMonth() === targetMonth &&
          d.getFullYear() === targetYear
        );
      });

      if (monthlySchedules.length > 0) {
        collections.push({
          loanId: loan._id,
          customer: loan.customer,
          principal: loan.principal,
          monthlyPayment,
          dueDates: monthlySchedules.map((s) => ({
            date: s.dueDate,
            amount: s.amount || monthlyPayment,
            paid: s.paid || false,
          })),
          status: loan.status,
        });
      }
    }

    res.json({
      month: targetMonth,
      year: targetYear,
      collections,
    });
  } catch (err) {
    console.error("❌ COLLECTION ERROR:", err);

    res.status(500).json({
      message: "Failed to get collection timetable",
      error: err.message,
    });
  }
});

module.exports = router;
