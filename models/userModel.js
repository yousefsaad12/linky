const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide a name"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Please provide a email"],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: validator.isEmail,
      message: "Please provide a valid email address",
    },
  },

  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: [7, "Password must be at least 7 characters long"],
    select : false
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    minlength: [7, "Password must be at least 7 characters long"],
    validate: {
      validator: function (value) {
        return value === this.password;
      },
      message: "Passwords do not match",
    },
  },
  passwordChangedAt: Date,
});


module.exports = mongoose.model("User", userSchema);
