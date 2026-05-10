const autocannon = require("autocannon");
const encodeBase62 = require("./utils/base62");

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";
const DURATION = Number(process.env.DURATION) || 10;
const KEYSPACE = Number(process.env.KEYSPACE) || 100_000;

const randomCode = () => encodeBase62((Math.random() * KEYSPACE + 1) | 0);

function run({ title, method, path, connections, body }) {
  return new Promise((resolve) => {
    console.log(`\n📊 ${title}`);

    const instance = autocannon({
      url: BASE_URL,
      duration: DURATION,
      connections,
      timeout: 10,
      requests: [
        {
          method,
          headers: body ? { "content-type": "application/json" } : {},
          setupRequest(req) {
            req.path = method === "GET" ? `/api/v1/url/${randomCode()}` : path;
            if (body) req.body = body;
            return req;
          },
        },
      ],
    });

    autocannon.track(instance, { renderProgressBar: true });
    instance.on("done", resolve);
  });
}

(async () => {
  console.log("🚀 Starting benchmarks...\n");

  const [read, write] = await Promise.all([
    run({
      title: "GET /url/:shortCode (50 connections)",
      method: "GET",
      path: "/api/v1/url",
      connections: 15,
    }),
    run({
      title: "POST /url (2 connections)",
      method: "POST",
      path: "/api/v1/url",
      connections: 2,
      body: JSON.stringify({ originalUrl: "https://test.com/test" }),
    }),
  ]);

  const fmt = (r) =>
    `avg ${r.requests.average} req/s | p99 latency ${r.latency.p99}ms | errors ${r.errors}`;

  console.log("\n── Results ──────────────────────────");
  console.log(`READ  ${fmt(read)}`);
  console.log(`WRITE ${fmt(write)}`);
  console.log("─────────────────────────────────────");
})();