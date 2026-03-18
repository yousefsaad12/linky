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
  },
  { timestamps: true },
);

urlSchema.index({ shortCode: 1 }, { unique: true });
urlSchema.index({ createdAt: 1 }, { expireAfterSeconds: years(5) });

module.exports = mongoose.model("Url", urlSchema);
