const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Loan = require("../models/Loan");
const User = require("../models/User");
// const { protect } = require("../middleware/auth"); // uncomment if using auth

// 📅 GET COLLECTION TIMETABLE (monthly)
router.get(
  "/timetable",
  // protect(["admin", "staff"]), // enable if needed
  async (req, res) => {
    try {
      let { month, year } = req.query;

      month = Number(month);
      year = Number(year);

      if (isNaN(month) || isNaN(year)) {
        return res.status(400).json({
          message: "Month and year must be valid numbers",
        });
      }

      // 🗓️ Date range for the selected month
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      // 🔎 Find active loans
      const loans = await Loan.find({
        status: { $in: ["ACTIVE", "ONGOING"] },
      })
        .populate("customer", "name email")
        .lean();

      const collections = [];

      for (const loan of loans) {
        if (!loan.schedule || !loan.schedule.length) continue;

        // 📆 Filter schedule for this month
        const dueDates = loan.schedule.filter((item) => {
          const d = new Date(item.date);
          return d >= startDate && d <= endDate;
        });

        if (dueDates.length === 0) continue;

        collections.push({
          loanId: loan._id,
          customer: loan.customer,
          principal: loan.amount,
          monthlyPayment: loan.monthlyPayment,
          dueDates: dueDates.map((d) => ({
            date: d.date,
            amount: d.amount || loan.monthlyPayment,
            paid: d.paid || false,
          })),
          status: loan.status,
        });
      }

      res.json({
        month,
        year,
        collections,
      });
    } catch (err) {
      console.error("Collection timetable error:", err);
      res.status(500).json({
        message: "Failed to fetch collection timetable",
        error: err.message,
      });
    }
  },
);

// 💰 MARK PAYMENT AS PAID
router.patch(
  "/pay/:loanId/:dateId",
  // protect(["admin", "staff"]),
  async (req, res) => {
    try {
      const { loanId, dateId } = req.params;

      const loan = await Loan.findById(loanId);
      if (!loan) {
        return res.status(404).json({ message: "Loan not found" });
      }

      const scheduleItem = loan.schedule.id(dateId);
      if (!scheduleItem) {
        return res.status(404).json({ message: "Schedule item not found" });
      }

      scheduleItem.paid = true;

      await loan.save();

      res.json({ message: "Payment marked as paid" });
    } catch (err) {
      console.error("Payment update error:", err);
      res.status(500).json({
        message: "Failed to update payment",
        error: err.message,
      });
    }
  },
);

module.exports = router;
