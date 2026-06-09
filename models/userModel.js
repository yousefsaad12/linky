const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      select : false // Add index for faster lookups
    },

    avatar: {
      type: String,
      default: null,
    },


    isActive: {
      type: Boolean,
      default: true,
      select : false
    },

    plan: {
      type: String,
      enum: ["free", "pro"],
      default: "free",
    },
  },
  {
    timestamps: true, // Automatically adds createdAt & updatedAt
  },
);


userSchema.index({ email: 1, googleId: 1 });

module.exports = mongoose.model("User", userSchema);
