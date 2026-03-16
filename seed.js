const mongoose = require('mongoose');
const Url = require('./models/urlModel');
const Counter = require('./models/counterModel');
require('dotenv').config({ path: './config.env' }); // same as your server
const encodeBase62 = require("./utils/base62")

async function seed() {
  // Same connection as your server
  const DB = process.env.DATABASE.replace(
    '<PASSWORD>',
    process.env.DATABASE_PASSWORD
  );

  await mongoose.connect(DB);
  console.log('Connected to MongoDB ✓');

  // Clear old data
  await Url.deleteMany({});
  await Counter.deleteMany({});
  console.log('Old data cleared ✓');

  // Reset counter to 1000 (matching how many docs we insert)
  await Counter.create({ _id: 'url', seq: 1000 });
  console.log('Counter reset to 1000 ✓');

  // Insert 1000 urls
  const docs = [];
  for (let i = 1; i <= 1000; i++) {
    docs.push({
      shortCode: encodeBase62(i),
      originalUrl: `https://github.com/user/repository-${i}`,
      clicks: 0,
      createdAt: new Date(),
      expiresAt: new Date('2031-01-01'),
    });
  }

  await Url.insertMany(docs);
  console.log('✓ 1000 documents inserted. Sample:');
  [1, 10, 62, 100, 1000].forEach(n =>
    console.log(`  counter ${n} → shortCode "${encodeBase62(n)}"`)
  );

  await mongoose.disconnect();
  console.log('Done ✓');
}

seed().catch(console.error);