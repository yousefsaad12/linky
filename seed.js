const mongoose = require("mongoose");
const Url = require("./models/urlModel");
const Counter = require("./models/counterModel");
require("dotenv").config();
const encodeBase62 = require("./utils/base62");

const SEED_COUNT = 200000;
const CHUNK_SIZE = 5000;

async function seed() {
  const DB = process.env.DATABASE.replace(
    "<PASSWORD>",
    process.env.DATABASE_PASSWORD
  );

  await mongoose.connect(DB, {
    maxPoolSize: 20,
  });

  console.log("Connected to MongoDB ✓");

  // Clean old data
  await Url.deleteMany({});
  await Counter.deleteMany({});
  console.log("Old data cleared ✓");

  // Reset counter
  await Counter.create({ _id: "url_count", seq: SEED_COUNT });
  console.log(`Counter set to ${SEED_COUNT} ✓`);

  console.log("Seeding started...");

  for (let i = 1; i <= SEED_COUNT; i += CHUNK_SIZE) {
    const batch = [];

    for (let j = i; j < i + CHUNK_SIZE && j <= SEED_COUNT; j++) {
      batch.push({
        shortCode: encodeBase62(j),
        originalUrl: `https://github.com/user/repository-${j}`,
        createdAt: new Date(),
      });
    }

    await Url.insertMany(batch, { ordered: false });

    console.log(`Inserted: ${i} → ${Math.min(i + CHUNK_SIZE - 1, SEED_COUNT)}`);
  }

  console.log(`✓ ${SEED_COUNT.toLocaleString()} documents inserted`);

  console.log("Sample mapping:");
  [1, 10, 62, 100, SEED_COUNT].forEach((n) =>
    console.log(`  ${n} → ${encodeBase62(n)}`)
  );

  await mongoose.disconnect();
  console.log("Done ✓");
}

seed().catch(console.error);