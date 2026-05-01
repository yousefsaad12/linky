const autocannon = require("autocannon");
const encodeBase62 = require("./utils/base62");

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";
const DURATION = 60;

const READ_RPS = 1000;
const WRITE_RPS = 10;

const KEYSPACE = 100000;

const rand = (n) => (Math.random() * n) | 0;

const randomCode = () => encodeBase62(rand(KEYSPACE) + 1);

function run({ method, path, rps, connections }) {
  return new Promise((resolve) => {
    const instance = autocannon({
      url: BASE_URL,
      duration: DURATION,
      connections,
      overallRate: rps,

      requests: [
        {
          method,
          path,
          headers: method === "POST"
            ? { "content-type": "application/json" }
            : {},

          setupRequest(req) {
            if (method === "POST") {
              req.body = JSON.stringify({
                originalUrl: "https://test.com/test"
              });
            }
            return req;
          },
        },
      ],
    });

    autocannon.track(instance, { renderProgressBar: true });
    instance.on("done", resolve);
  });
}

(async function () {
  console.log("🚀 Benchmark");

  const read = await run({
    method: "GET",
    path: `/api/v1/url/${randomCode()}`,
    rps: READ_RPS,
    connections: 50,
  });

  const write = await run({
    method: "POST",
    path: "/api/v1/url",
    rps: WRITE_RPS,
    connections: 10,
  });

  console.log("\nREAD:", read.requests.average);
  console.log("WRITE:", write.requests.average);
})();