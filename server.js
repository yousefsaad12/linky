require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./app");
const { assertRedisReady } = require("./utils/redisClient");
const { getMongoUri } = require("./utils/dbUri");
const worker = require("./workers/worker");

async function startServer() {
  try {
    const uri = getMongoUri();
    await mongoose.connect(uri, {
      maxPoolSize: 5,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 3000,
    });
    console.log("✅ DB connected!");

    await assertRedisReady().catch(() =>
      console.warn("⚠️ Redis unavailable, continuing without it"),
    );

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(
        `🚀 App running on port ${port} [${process.env.NODE_ENV || "development"}]`,
      );
    });
  } catch (err) {
    console.error("❌ Startup failed:", err.message);
    process.exit(1);
  }
}

startServer();
