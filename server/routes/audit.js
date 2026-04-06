const express = require("express");
const router = express.Router();
const AuditLog = require("../models/AuditLog");
const { protect } = require("../middleware/auth");

console.log("✅ Loading audit routes...");

// GET all audit logs (admin only)
router.get("/", protect(["admin"]), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const auditLogs = await AuditLog.find()
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AuditLog.countDocuments();

    res.json({
      auditLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Get audit logs error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET audit logs for specific entity
router.get("/entity/:entity/:entityId", protect(["admin"]), async (req, res) => {
  try {
    const { entity, entityId } = req.params;

    const auditLogs = await AuditLog.find({ entity, entityId })
      .populate("user", "name email role")
      .sort({ createdAt: -1 });

    res.json({ auditLogs });
  } catch (err) {
    console.error("Get entity audit logs error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET audit logs for specific user
router.get("/user/:userId", protect(["admin"]), async (req, res) => {
  try {
    const { userId } = req.params;

    const auditLogs = await AuditLog.find({ user: userId })
      .populate("user", "name email role")
      .sort({ createdAt: -1 });

    res.json({ auditLogs });
  } catch (err) {
    console.error("Get user audit logs error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;