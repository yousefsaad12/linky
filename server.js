
const mongoose = require("mongoose");
require("dotenv").config({ path: "./config.env" }); 
const app = require("./app");

if (!process.env.DATABASE || !process.env.DATABASE_PASSWORD) {
  throw new Error("Please define DATABASE and DATABASE_PASSWORD in .env");
}

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB)
  .then(() => console.log("DB connection successful!"))
  .catch(err => console.log("DB connection error:", err));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`App running on port ${port}...`));
