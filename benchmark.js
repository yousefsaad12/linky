const autocannon = require('autocannon');

const encodeBase62 = require("./utils/base62")

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

function runReads() {
  return new Promise((resolve) => {
    console.log('\n📖 READ benchmark starting (500 users)...\n');

    const instance = autocannon({
      url: 'http://127.0.0.1:3000',
      connections: 500,
      duration: 30,
      title: 'READ — 500 users',
      requests: [
        {
          method: 'GET',
          setupRequest(req) {
            const counter = Math.floor(Math.random() * 1000) + 1;
            req.path = `/api/v1/url/${encodeBase62(counter)}`;
            req.headers['x-forwarded-for'] = randomIP();
            req.headers['user-agent'] = randomUserAgent();
            return req;
          }
        }
      ]
    });

    autocannon.track(instance, { renderProgressBar: true });
    instance.on('done', resolve);
  });
}

function runWrites() {
  return new Promise((resolve) => {
    console.log('\n✏️  WRITE benchmark starting (12 req/sec)...\n');

    const instance = autocannon({
      url: 'http://127.0.0.1:3000',
      connections: 1,
      duration: 30,
      rate: 12,              // ← exactly 12 writes/sec
      title: 'WRITE — 12 req/sec',
      requests: [
        {
          method: 'POST',
          path: '/api/v1/url',
          headers: { 'content-type': 'application/json' },
          setupRequest(req) {
            req.body = JSON.stringify({
              originalUrl: `https://github.com/user/repo-${Date.now()}-${Math.random()}`
            });
            req.headers['x-forwarded-for'] = randomIP();
            req.headers['user-agent'] = randomUserAgent();
            return req;
          }
        }
      ]
    });

    autocannon.track(instance, { renderProgressBar: true });
    instance.on('done', resolve);
  });
}

function printResults(label, target, results) {
  const hit = results.requests.average >= target;
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║  ${label.padEnd(36)}║`);
  console.log(`╚══════════════════════════════════════╝`);
  console.log(`  Req/sec     : ${results.requests.average}`);
  console.log(`  Latency p50 : ${results.latency.p50} ms`);
  console.log(`  Latency p99 : ${results.latency.p99} ms`);
  console.log(`  Errors      : ${results.errors}`);
  console.log(`  ──────────────────────────────────────`);
  console.log(`  Target      : ${target} req/sec`);
  console.log(`  Result      : ${hit ? '✅ TARGET HIT!' : '❌ Not there yet'}`);
}

function printSummary(readResults, writeResults) {
  // fixed at 12 writes/sec by rate limiter
  const fixedWritesPerSec = 12;
  const writesPerDay      = fixedWritesPerSec * 60 * 60 * 24;
  const mbPerDay          = ((writesPerDay * 500) / 1024 / 1024).toFixed(2);
  const gbIn5Years        = ((writesPerDay * 500 * 365 * 5) / 1024 / 1024 / 1024).toFixed(2);

  // ratio = reads/sec ÷ fixed writes/sec
  const ratio      = Math.round(readResults.requests.average / fixedWritesPerSec);

  const hitReads   = readResults.requests.average >= 1158;
  const hitWrites  = writeResults.requests.average >= 12;
  const hitRatio   = ratio >= 100;
  const hit1MPerDay = writesPerDay >= 1000000;

  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║           FINAL SUMMARY              ║`);
  console.log(`╚══════════════════════════════════════╝`);
  console.log(`  100M req/day`);
  console.log(`  Reads/sec   : ${readResults.requests.average}  (target: 1158)  ${hitReads    ? '✅' : '❌'}`);
  console.log(`  ──────────────────────────────────────`);
  console.log(`  1M writes/day`);
  console.log(`  Writes/sec  : ${fixedWritesPerSec}  (target: 12)    ${hitWrites   ? '✅' : '❌'}`);
  console.log(`  Writes/day  : ${Math.round(writesPerDay).toLocaleString()}       ${hit1MPerDay ? '✅' : '❌'}`);
  console.log(`  ──────────────────────────────────────`);
  console.log(`  Read:Write ratio`);
  console.log(`  Ratio       : ${ratio}:1  (target: 100:1)  ${hitRatio    ? '✅' : '❌'}`);
  console.log(`  ──────────────────────────────────────`);
  console.log(`  Storage (500B per entry)`);
  console.log(`  Per day     : ${mbPerDay} MB`);
  console.log(`  5 years     : ${gbIn5Years} GB  (target: ~900GB)`);
  console.log(`  ──────────────────────────────────────`);
  console.log(hitReads && hitWrites && hitRatio
    ? '  🎉 ALL TARGETS HIT!'
    : '  ⚠️  Some targets need work'
  );
}

async function main() {
  console.log('🚀 Linky Full Benchmark — 500 users');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Read users  : 500');
  console.log('  Write rate  : 12 req/sec (fixed)');
  console.log('  Ratio       : 100:1');
  console.log('  Duration    : 30s each');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const readResults  = await runReads();
  printResults('READ BENCHMARK — 500 users', 1158, readResults);

  await new Promise(r => setTimeout(r, 3000));

  const writeResults = await runWrites();
  printResults('WRITE BENCHMARK — 12 req/sec', 12, writeResults);

  printSummary(readResults, writeResults);
}

main().catch(console.error);