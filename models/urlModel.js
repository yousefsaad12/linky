const mongoose = require("mongoose");


const urlSchema = new mongoose.Schema({
  shortCode: {
    type: String,
    unique: true,
  },

  originalUrl: {
    type: String,
    unique: true,
    required: true,
    validate: {
      validator: (u) => {
        try {
          new URL(u);
          return true;
        } catch (error) {
          return false;
        }
      },
      message: "Invalid URL",
    },
  },

  clicks: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  expiresAt: {
    type: Date,
    default: () => {
      const date = new Date();
      date.setFullYear(date.getFullYear() + 5);
      return date;
    },
  },
});

urlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Url", urlSchema)
