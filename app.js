const express = require("express");
const urlRouter = require("./routes/urlRoutes");
const globalErrorHandler = require("./middlewares/errorMiddleware");
const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/api/v1/url", urlRouter);
app.use(globalErrorHandler);
module.exports = app;
