const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true, // fast lookup
    },

    value: {
      type: mongoose.Schema.Types.Mixed, // can store number, string, boolean, object
      required: true,
    },

    type: {
      type: String,
      enum: ["string", "number", "boolean", "object", "array"],
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      default: "general",
      index: true,
    },
  },
  { timestamps: true },
);

// ==============================
// 🔧 Helper method: get typed value
// ==============================
settingsSchema.methods.getValue = function () {
  switch (this.type) {
    case "number":
      return Number(this.value);
    case "boolean":
      return Boolean(this.value);
    case "string":
      return String(this.value);
    case "object":
    case "array":
      return this.value;
    default:
      return this.value;
  }
};

// ==============================
// 🔧 Static helper: get setting by key
// ==============================
settingsSchema.statics.getSetting = async function (key) {
  const setting = await this.findOne({ key });
  if (!setting) return null;
  return setting.getValue();
};

// ==============================
// 🔧 Indexes
// ==============================
settingsSchema.index({ key: 1, category: 1 });

module.exports = mongoose.model("Settings", settingsSchema);
