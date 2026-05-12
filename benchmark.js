const autocannon = require("autocannon");
const mongoose = require("mongoose");
require("dotenv").config();

const BASE_URL = "http://127.0.0.1:3000";
const DURATION = Number(process.env.DURATION) || 60;

// ── Fetch real codes from DB ──────────────────────────────────────────────────
async function getRealCodes(limit = 500) {
  const DB =
    process.env.DATABASE_LOCAL ||
    process.env.DATABASE.replace("<PASSWORD>", process.env.DATABASE_PASSWORD);

  await mongoose.connect(DB);
  const docs = await mongoose.connection
    .collection("urls")
    .find({}, { projection: { shortCode: 1 } })
    .limit(limit)
    .toArray();

  await mongoose.disconnect();

  const codes = docs.map((d) => d.shortCode).filter(Boolean);
  if (codes.length === 0)
    throw new Error("No URLs found in DB. Seed some first.");
  console.log(`✅ Loaded ${codes.length} real short codes from DB\n`);
  return codes;
}

// ── Runner ────────────────────────────────────────────────────────────────────
function run({ title, connections, duration, setupRequest }) {
  return new Promise((resolve) => {
    console.log(`\n📊 ${title}`);
    console.log(`   connections: ${connections} | duration: ${duration}s`);

    const instance = autocannon({
      url: BASE_URL,
      duration,
      connections,
      pipelining: 1,
      timeout: 10,
      requests: [
        {
          method: "GET",
          path: "/api/v1/url",
          setupRequest,
        },
      ],
    });

    autocannon.track(instance, { renderProgressBar: true });
    instance.on("done", resolve);
  });
}

// ── Format ────────────────────────────────────────────────────────────────────
function fmt(label, r) {
  const errRate = ((r.non2xx / (r.requests.total || 1)) * 100).toFixed(1);
  return [
    `  ${label}`,
    `    avg: ${r.requests.average.toLocaleString()} req/s`,
    `    p50: ${r.latency.p50}ms | p99: ${r.latency.p99}ms | max: ${r.latency.max}ms`,
    `    total: ${r.requests.total.toLocaleString()} requests`,
    `    errors: ${r.errors} | non-2xx: ${r.non2xx} (${errRate}%)`,
  ].join("\n");
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log("🚀 Starting READ stress benchmarks...\n");

  let codes;
  try {
    codes = await getRealCodes(500);
  } catch (err) {
    console.error("❌ Failed to load codes:", err.message);
    process.exit(1);
  }

  const randomCode = () => codes[Math.floor(Math.random() * codes.length)];
  const setup = (req) => {
    req.path = `/api/v1/url/${randomCode()}`;
    return req;
  };

  // 1. Warm up cache
  console.log("🔥 Warming up cache...");
  await run({
    title: "Warm-up (5 connections)",
    connections: 5,
    duration: 5,
    setupRequest: setup,
  });

  // 2. Light load
  const r1 = await run({
    title: "GET — light (10 connections)",
    connections: 10,
    duration: DURATION,
    setupRequest: setup,
  });

  // 3. Moderate load
  const r2 = await run({
    title: "GET — moderate (50 connections)",
    connections: 50,
    duration: DURATION,
    setupRequest: setup,
  });

  // 4. High load
  const r3 = await run({
    title: "GET — high (100 connections)",
    connections: 100,
    duration: DURATION,
    setupRequest: setup,
  });

  // 5. Stress load
  const r4 = await run({
    title: "GET — stress (200 connections)",
    connections: 200,
    duration: DURATION,
    setupRequest: setup,
  });

  // 6. Peak load
  const r5 = await run({
    title: "GET — peak (500 connections)",
    connections: 500,
    duration: DURATION,
    setupRequest: setup,
  });

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(55));
  console.log("  READ STRESS TEST RESULTS");
  console.log("─".repeat(55));
  console.log(fmt("10  conn (light)   ", r1));
  console.log(fmt("50  conn (moderate)", r2));
  console.log(fmt("100 conn (high)    ", r3));
  console.log(fmt("200 conn (stress)  ", r4));
  console.log(fmt("500 conn (peak)    ", r5));
  console.log("─".repeat(55));
})();