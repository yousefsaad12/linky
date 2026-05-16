const mongoose = require("mongoose");
const { years } = require("./../utils/time");
const urlSchema = new mongoose.Schema(
  {
    shortCode: {
      type: String,

      required: true,
    },

    originalUrl: {
      type: String,

      required: true,
    },

    clicks: { type: Number, default: 0 },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
  },
  { timestamps: true },
);

urlSchema.index({ shortCode: 1 }, { unique: true });
urlSchema.index({ user: 1, createdAt: -1 });
urlSchema.index({ createdAt: 1 }, { expireAfterSeconds: years(5) });

module.exports = mongoose.model("Url", urlSchema);
