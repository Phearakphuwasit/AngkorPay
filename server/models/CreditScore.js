const creditScoreSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    score: { type: Number, required: true, default: 600 }, // 300-850 scale
    rating: {
      type: String,
      enum: ["Poor", "Fair", "Good", "Excellent"],
      default: "Fair",
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("CreditScore", creditScoreSchema);
