const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    // 👤 Who performed the action
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 🔥 Action type (standardized)
    action: {
      type: String,
      required: true,
      enum: [
        "CREATE",
        "UPDATE",
        "DELETE",
        "LOGIN",
        "LOGOUT",
        "APPROVE",
        "REJECT",
      ],
      index: true,
    },

    // 📦 Entity affected
    entity: {
      type: String,
      required: true,
      index: true, // e.g. "Loan", "Customer"
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // 🔄 Data changes
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // 🌐 Request metadata (VERY IMPORTANT in real systems)
    ipAddress: {
      type: String,
    },

    userAgent: {
      type: String,
    },

    // 📝 Optional message (human readable)
    description: {
      type: String,
    },

    // 🧾 Status of action
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      default: "SUCCESS",
    },

    // 🧵 Correlation ID (for tracing requests across services)
    requestId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    versionKey: false,
  },
);

// 🚀 Compound index for fast queries
AuditLogSchema.index({ entity: 1, entityId: 1 });
AuditLogSchema.index({ user: 1, createdAt: -1 });

// 🧹 Optional: limit document size (prevent huge logs)
AuditLogSchema.pre("save", function (next) {
  const MAX_SIZE = 10000; // characters
  if (this.before && JSON.stringify(this.before).length > MAX_SIZE) {
    this.before = { truncated: true };
  }
  if (this.after && JSON.stringify(this.after).length > MAX_SIZE) {
    this.after = { truncated: true };
  }
  next();
});

const AuditLog =
  mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);

module.exports = AuditLog;
