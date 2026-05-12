require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./app");
const { assertRedisReady } = require("./utils/redisClient");

if (!process.env.DATABASE || !process.env.DATABASE_PASSWORD) {
  throw new Error("Missing DATABASE or DATABASE_PASSWORD in .env");
}

const DB =
  process.env.NODE_ENV === "production"
    ? process.env.DATABASE.replace("<PASSWORD>", process.env.DATABASE_PASSWORD)
    : process.env.DATABASE_LOCAL;

async function startServer() {
  try {
    await mongoose.connect(DB, {
      maxPoolSize: 5,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 3000,
    });
    console.log("✅ DB connected!");

    await assertRedisReady().catch(() =>
      console.warn("⚠️ Redis unavailable, continuing without it")
    );

    require("./workers/analyticsWorker");
    console.log("✅ Analytics worker started!");

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`🚀 App running on port ${port} [${process.env.NODE_ENV || "development"}]`);
    });
  } catch (err) {
    console.error("❌ Startup failed:", err.message);
    process.exit(1);
  }
}

startServer();