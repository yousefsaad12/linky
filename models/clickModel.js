const mongoose = require("mongoose");
const { years } = require("./../utils/time");
const clickSchema = mongoose.Schema({
  shortCode: {
    type: String,

    required: true,
  },

  os: {
    type: String,
  },
  browser: {
    type: String,
  },
  region: {
    type: String,
  },
  city: {
    type: String,
  },

  deviceType: {
    type: String,
    enum: ["mobile", "tablet", "desktop", "unknown"],
    default: "unknown",
  },
  referrer: {
    type: String,
    default: "direct",
  },

  clickedAt: { type: Date, default: Date.now },
});

clickSchema.index({ shortCode: 1, clickedAt: -1 });
clickSchema.index({ clickedAt: 1 }, { expireAfterSeconds: years(5) });
module.exports = mongoose.model("Click", clickSchema);
