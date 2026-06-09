const mongoose = require("mongoose");

const apiKeySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: "Default",
      maxlength: 64,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
    },
    prefix: {
      type: String,
      required: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

apiKeySchema.index({ user: 1, revokedAt: 1 });

module.exports = mongoose.model("ApiKey", apiKeySchema);
