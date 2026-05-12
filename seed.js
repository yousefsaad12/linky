const mongoose = require("mongoose");
const Url = require("./models/urlModel");
const Counter = require("./models/counterModel");
const encodeBase62 = require("./utils/base62");

require("dotenv").config();

const SEED_COUNT = 100000;
const CHUNK_SIZE = 5000;

async function seed() {
  const DB =
    process.env.NODE_ENV === "production"
      ? process.env.DATABASE.replace(
          "<PASSWORD>",
          process.env.DATABASE_PASSWORD
        )
      : process.env.DATABASE_LOCAL;

  await mongoose.connect(DB, {
    maxPoolSize: 20,
  });

  console.log("✅ MongoDB connected");

  // REMOVE OLD DATA
  try {
    await Url.collection.drop();
    console.log("✅ Url collection dropped");
  } catch (err) {
    if (err.code !== 26) throw err;
  }

  try {
    await Counter.collection.drop();
    console.log("✅ Counter collection dropped");
  } catch (err) {
    if (err.code !== 26) throw err;
  }

  // RESET COUNTER
  await Counter.create({
    _id: "url_count",
    seq: SEED_COUNT,
  });

  console.log(`✅ Counter reset to ${SEED_COUNT}`);

  console.log("🚀 Seeding started...");

  for (let i = 1; i <= SEED_COUNT; i += CHUNK_SIZE) {
    const batch = [];
    const now = new Date();

    for (
      let j = i;
      j < i + CHUNK_SIZE && j <= SEED_COUNT;
      j++
    ) {
      batch.push({
        shortCode: encodeBase62(j),
        originalUrl: `https://github.com/user/repository-${j}`,
        createdAt: now,
      });
    }

    await Url.insertMany(batch, {
      ordered: false,
      lean: true,
      timestamps: false,
    });

    console.log(
      `✅ Inserted ${Math.min(
        i + CHUNK_SIZE - 1,
        SEED_COUNT
      )}/${SEED_COUNT}`
    );
  }

  // REBUILD INDEXES
  await Url.syncIndexes();

  console.log("✅ Indexes synced");
  console.log("🎉 Seed completed");

  console.log("\nSample Base62:");

  [1, 10, 61, 62, 1000, SEED_COUNT].forEach((n) => {
    console.log(`${n} → ${encodeBase62(n)}`);
  });

  await mongoose.disconnect();

  console.log("✅ Mongo disconnected");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});