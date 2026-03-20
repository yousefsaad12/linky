const autocannon = require("autocannon");
const http = require("http");
const https = require("https");
const encodeBase62 = require("./utils/base62");

const BASE_URL = process.env.BENCH_BASE_URL || "http://127.0.0.1:3000";
const DURATION_SECONDS = Number(process.env.BENCH_DURATION || 60);
const TARGET_READ_RPS = Number(process.env.TARGET_READ_RPS || 1158); // 100M/day-ish reads
const TARGET_WRITE_RPS = Number(process.env.TARGET_WRITE_RPS || 12); // 1M/day writes
const TARGET_RATIO = Number(process.env.TARGET_RATIO || 100);
const BYTES_PER_ENTRY = Number(process.env.ENTRY_BYTES || 500);
const READ_KEYSPACE = Number(process.env.READ_KEYSPACE || 200000);
const PREFLIGHT_SAMPLES = Number(process.env.PREFLIGHT_SAMPLES || 20);
const RUN_BURST = process.env.RUN_BURST === "true";
const BURST_RPS = (process.env.BURST_RPS || "2000,5000,10000")
  .split(",")
  .map((x) => Number(x.trim()))
  .filter((n) => Number.isFinite(n) && n > 0);
const BURST_SECONDS = Number(process.env.BURST_SECONDS || 15);
const SLO_P95_MS = Number(process.env.SLO_P95_MS || 200);
const SLO_P99_MS = Number(process.env.SLO_P99_MS || 1000);
const MAX_5XX = Number(process.env.MAX_5XX || 0);
const MAX_4XX = Number(process.env.MAX_4XX || 0);
const READ_SUCCESS_CLASS = process.env.READ_SUCCESS_CLASS || "2xx";
const WRITE_SUCCESS_CLASS = process.env.WRITE_SUCCESS_CLASS || "2xx";

function randomIP() {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}
function randomUserAgent() {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile/15E148',
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) Chrome/120.0.0.0',
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

function randomCounter() {
  return Math.floor(Math.random() * READ_KEYSPACE) + 1;
}

function requestStatus(pathname) {
  const target = new URL(BASE_URL);
  const mod = target.protocol === "https:" ? https : http;
  const options = {
    protocol: target.protocol,
    hostname: target.hostname,
    port: target.port || (target.protocol === "https:" ? 443 : 80),
    path: pathname,
    method: "GET",
    headers: {
      "x-forwarded-for": randomIP(),
      "user-agent": randomUserAgent(),
    },
  };

  return new Promise((resolve, reject) => {
    const req = mod.request(options, (res) => {
      resolve(res.statusCode || 0);
      res.resume();
    });
    req.on("error", reject);
    req.end();
  });
}

async function preflight() {
  console.log("\n🔎 Running preflight checks...");
  const statuses = { ok: 0, notFound: 0, rateLimited: 0, other: 0 };
  for (let i = 0; i < PREFLIGHT_SAMPLES; i++) {
    const code = encodeBase62(randomCounter());
    const status = await requestStatus(`/api/v1/url/${code}`);
    if (
      (READ_SUCCESS_CLASS === "2xx" && status >= 200 && status < 300) ||
      (READ_SUCCESS_CLASS === "3xx" && status >= 300 && status < 400)
    ) {
      statuses.ok += 1;
    }
    else if (status === 404) statuses.notFound += 1;
    else if (status === 429) statuses.rateLimited += 1;
    else statuses.other += 1;
  }

  console.log(
    `Preflight: redirects=${statuses.ok}, notFound=${statuses.notFound}, rateLimited=${statuses.rateLimited}, other=${statuses.other}`,
  );

  const successRate = statuses.ok / PREFLIGHT_SAMPLES;
  if (successRate < 0.9) {
    console.log(
      `⚠️ Low redirect success in preflight (${(successRate * 100).toFixed(1)}%). You likely need more seed data or your rate limits are too strict for test mode.`,
    );
  }

  const requiredSeed = READ_KEYSPACE;
  console.log(
    `Seed requirement for this run: at least ${requiredSeed.toLocaleString()} URL docs (shortCode 1..${READ_KEYSPACE}).`,
  );
}

function runReadBenchmark() {
  return new Promise((resolve) => {
    console.log(`\n📖 READ benchmark starting (${TARGET_READ_RPS} req/sec target)...\n`);

    const instance = autocannon({
      url: BASE_URL,
      connections: 350,
      duration: DURATION_SECONDS,
      overallRate: TARGET_READ_RPS,
      title: "READ — requirement profile",
      requests: [
        {
          method: "GET",
          setupRequest(req) {
            const counter = randomCounter();
            req.path = `/api/v1/url/${encodeBase62(counter)}`;
            req.headers["x-forwarded-for"] = randomIP();
            req.headers["user-agent"] = randomUserAgent();
            return req;
          },
        },
      ],
    });

    autocannon.track(instance, { renderProgressBar: true });
    instance.on('done', resolve);
  });
}

function runWriteBenchmark() {
  return new Promise((resolve) => {
    console.log(`\n✏️  WRITE benchmark starting (${TARGET_WRITE_RPS} req/sec target)...\n`);

    const instance = autocannon({
      url: BASE_URL,
      connections: 20,
      duration: DURATION_SECONDS,
      overallRate: TARGET_WRITE_RPS,
      title: "WRITE — requirement profile",
      requests: [
        {
          method: "POST",
          path: "/api/v1/url",
          headers: { "content-type": "application/json" },
          setupRequest(req) {
            req.body = JSON.stringify({
              originalUrl: `https://github.com/user/repo-${Date.now()}-${Math.random()}`,
            });
            req.headers["x-forwarded-for"] = randomIP();
            req.headers["user-agent"] = randomUserAgent();
            return req;
          },
        },
      ],
    });

    autocannon.track(instance, { renderProgressBar: true });
    instance.on('done', resolve);
  });
}

function classCount(results, klass) {
  return Number(results[klass] || 0);
}

function successStats(results, successClass) {
  const successCount = classCount(results, successClass);
  const responseCount =
    classCount(results, "1xx") +
    classCount(results, "2xx") +
    classCount(results, "3xx") +
    classCount(results, "4xx") +
    classCount(results, "5xx");

  const successRate = responseCount > 0 ? successCount / responseCount : 0;
  const successRps = results.requests.average * successRate;

  return { successCount, responseCount, successRate, successRps };
}

function printResults(label, target, results, successClass, mode = ">= target") {
  const avg = results.requests.average;
  const { successRate, successRps } = successStats(results, successClass);
  const hit = mode === "between 90%-110%"
    ? successRps >= target * 0.9 && successRps <= target * 1.1
    : successRps >= target;

  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║  ${label.padEnd(36)}║`);
  console.log(`╚══════════════════════════════════════╝`);
  console.log(`  Req/sec     : ${avg}`);
  console.log(`  Success/sec : ${successRps.toFixed(2)} (${successClass})`);
  console.log(`  Success rate: ${(successRate * 100).toFixed(2)}%`);
  const p95 = results.latency.p95 ?? results.latency.p97_5 ?? results.latency.p99;
  const p99 = results.latency.p99 ?? results.latency.p97_5 ?? p95;
  console.log(`  Latency p50 : ${results.latency.p50} ms`);
  console.log(`  Latency p95 : ${p95} ms`);
  console.log(`  Latency p99 : ${p99} ms`);
  console.log(`  Errors      : ${results.errors}`);
  console.log(`  4xx         : ${results["4xx"] || 0}`);
  console.log(`  5xx         : ${results["5xx"] || 0}`);
  console.log(`  ──────────────────────────────────────`);
  console.log(`  Target      : ${target} req/sec`);
  if (mode === "between 90%-110%") {
    console.log(`  Acceptable  : ${(target * 0.9).toFixed(1)} - ${(target * 1.1).toFixed(1)} req/sec`);
  }
  const latencyPass = p95 <= SLO_P95_MS && p99 <= SLO_P99_MS;
  const errorsPass = (results["5xx"] || 0) <= MAX_5XX;
  const rejectedPass = (results["4xx"] || 0) <= MAX_4XX;
  console.log(`  Result      : ${hit ? "✅ TARGET HIT!" : "❌ Not there yet"}`);
  console.log(
    `  SLO check    : p95<=${SLO_P95_MS}ms & p99<=${SLO_P99_MS}ms ${latencyPass ? "✅" : "❌"}`,
  );
  console.log(
    `  Error check  : 5xx<=${MAX_5XX} ${errorsPass ? "✅" : "❌"}`,
  );
  console.log(
    `  Reject check : 4xx<=${MAX_4XX} ${rejectedPass ? "✅" : "❌"}`,
  );
}

function printSummary(readResults, writeResults) {
  const readSuccess = successStats(readResults, READ_SUCCESS_CLASS);
  const writeSuccess = successStats(writeResults, WRITE_SUCCESS_CLASS);
  const actualReadsPerSec = readSuccess.successRps;
  const actualWritesPerSec = writeSuccess.successRps;
  const actualTotalPerSec = actualReadsPerSec + actualWritesPerSec;

  const writesPerDay = actualWritesPerSec * 60 * 60 * 24;
  const writesPerYear = writesPerDay * 365;
  const estimated5YearsGb = (
    (writesPerYear * 5 * BYTES_PER_ENTRY) /
    (1024 * 1024 * 1024)
  ).toFixed(2);
  const estimatedWritesDayMb = ((writesPerDay * BYTES_PER_ENTRY) / (1024 * 1024)).toFixed(2);

  const ratio = actualWritesPerSec > 0
    ? (actualReadsPerSec / actualWritesPerSec).toFixed(2)
    : "inf";

  const readHit = actualReadsPerSec >= TARGET_READ_RPS;
  const writeHit = actualWritesPerSec >= TARGET_WRITE_RPS * 0.9 && actualWritesPerSec <= TARGET_WRITE_RPS * 1.1;
  const ratioHit = Number(ratio) >= TARGET_RATIO * 0.9 && Number(ratio) <= TARGET_RATIO * 1.1;

  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║           FINAL SUMMARY              ║`);
  console.log(`╚══════════════════════════════════════╝`);
  console.log(`  Requirement profile`);
  console.log(`  Reads/sec   : ${actualReadsPerSec} (target: ${TARGET_READ_RPS}) ${readHit ? "✅" : "❌"}`);
  console.log(`  ──────────────────────────────────────`);
  console.log(`  Writes/sec  : ${actualWritesPerSec} (target: ${TARGET_WRITE_RPS}) ${writeHit ? "✅" : "❌"}`);
  console.log(`  Writes/day  : ${Math.round(writesPerDay).toLocaleString()} req`);
  console.log(`  ──────────────────────────────────────`);
  console.log(`  Read:Write ratio`);
  console.log(`  Ratio       : ${ratio}:1 (target: ${TARGET_RATIO}:1) ${ratioHit ? "✅" : "❌"}`);
  console.log(`  ──────────────────────────────────────`);
  console.log(`  Throughput projection`);
  console.log(`  Total req/day at this run : ${Math.round(actualTotalPerSec * 86400).toLocaleString()}`);
  console.log(`  ──────────────────────────────────────`);
  console.log(`  Storage projection (writes only @ ${BYTES_PER_ENTRY}B)`);
  console.log(`  Per day     : ${estimatedWritesDayMb} MB`);
  console.log(`  5 years     : ${estimated5YearsGb} GB`);
  console.log(`  ──────────────────────────────────────`);
  const readP95 =
    readResults.latency.p95 ?? readResults.latency.p97_5 ?? readResults.latency.p99;
  const readP99 =
    readResults.latency.p99 ?? readResults.latency.p97_5 ?? readP95;
  const writeP95 =
    writeResults.latency.p95 ?? writeResults.latency.p97_5 ?? writeResults.latency.p99;
  const writeP99 =
    writeResults.latency.p99 ?? writeResults.latency.p97_5 ?? writeP95;
  const latencyPass =
    readP95 <= SLO_P95_MS &&
    readP99 <= SLO_P99_MS &&
    writeP95 <= SLO_P95_MS &&
    writeP99 <= SLO_P99_MS;
  const errorsPass =
    (readResults["5xx"] || 0) <= MAX_5XX &&
    (writeResults["5xx"] || 0) <= MAX_5XX;
  const rejectedPass =
    (readResults["4xx"] || 0) <= MAX_4XX &&
    (writeResults["4xx"] || 0) <= MAX_4XX;

  const finalPass =
    readHit && writeHit && ratioHit && latencyPass && errorsPass && rejectedPass;
  console.log(finalPass ? "  🎉 REQUIREMENT PROFILE HIT!" : "  ⚠️ Requirement profile NOT fully met");
  console.log(`\nNote: If rate limiting is active and keyed by localhost IP, reads may be capped regardless of server capacity.`);
}

function runBurstPhase(rps) {
  return new Promise((resolve) => {
    console.log(`\n⚡ BURST phase: ${rps} req/sec for ${BURST_SECONDS}s...\n`);
    const instance = autocannon({
      url: BASE_URL,
      connections: Math.min(Math.max(Math.ceil(rps / 8), 50), 1000),
      duration: BURST_SECONDS,
      overallRate: rps,
      title: `BURST ${rps} rps`,
      requests: [
        {
          method: "GET",
          setupRequest(req) {
            const counter = randomCounter();
            req.path = `/api/v1/url/${encodeBase62(counter)}`;
            req.headers["x-forwarded-for"] = randomIP();
            req.headers["user-agent"] = randomUserAgent();
            return req;
          },
        },
      ],
    });
    autocannon.track(instance, { renderProgressBar: true });
    instance.on("done", resolve);
  });
}

async function runBurstSuite() {
  for (const rps of BURST_RPS) {
    const burstResult = await runBurstPhase(rps);
    printResults(
      `BURST ${rps} RPS`,
      rps,
      burstResult,
      READ_SUCCESS_CLASS,
      "between 90%-110%",
    );
  }
}

async function main() {
  console.log("🚀 Requirement Benchmark (mixed load)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Base URL    : ${BASE_URL}`);
  console.log(`  Read target : ${TARGET_READ_RPS} req/sec`);
  console.log(`  Write target: ${TARGET_WRITE_RPS} req/sec`);
  console.log(`  Ratio       : ${TARGET_RATIO}:1`);
  console.log(`  Duration    : ${DURATION_SECONDS}s`);
  console.log(`  Read keyspace: ${READ_KEYSPACE} docs`);
  console.log(`  Read success class : ${READ_SUCCESS_CLASS}`);
  console.log(`  Write success class: ${WRITE_SUCCESS_CLASS}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await preflight();

  const [readResults, writeResults] = await Promise.all([
    runReadBenchmark(),
    runWriteBenchmark(),
  ]);

  printResults("READ BENCHMARK", TARGET_READ_RPS, readResults, READ_SUCCESS_CLASS);
  printResults(
    "WRITE BENCHMARK",
    TARGET_WRITE_RPS,
    writeResults,
    WRITE_SUCCESS_CLASS,
    "between 90%-110%",
  );

  printSummary(readResults, writeResults);

  if (RUN_BURST) {
    await runBurstSuite();
  }
}

main().catch(console.error);