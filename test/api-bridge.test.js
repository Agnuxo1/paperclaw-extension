const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");

const { postJSON } = require("../dist/api-bridge");

function withServer(handler) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not resolve test server address"));
        return;
      }
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

test("postJSON sends JSON and parses successful responses", async () => {
  const server = await withServer((req, res) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      assert.equal(req.method, "POST");
      assert.equal(req.headers["content-type"], "application/json");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, received: JSON.parse(body) }));
    });
  });

  try {
    const result = await postJSON(`${server.url}/paperclaw/generate`, { title: "Demo" });
    assert.deepEqual(result, { ok: true, received: { title: "Demo" } });
  } finally {
    await server.close();
  }
});

test("postJSON surfaces server error envelopes", async () => {
  const server = await withServer((_req, res) => {
    res.writeHead(422, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Description is too short" }));
  });

  try {
    await assert.rejects(
      () => postJSON(`${server.url}/paperclaw/generate`, { description: "short" }),
      /Description is too short/,
    );
  } finally {
    await server.close();
  }
});

test("postJSON rejects malformed JSON", async () => {
  const server = await withServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end("<html>not json</html>");
  });

  try {
    await assert.rejects(
      () => postJSON(`${server.url}/paperclaw/generate`, {}),
      /Malformed JSON response/,
    );
  } finally {
    await server.close();
  }
});

test("postJSON rejects unsupported URL protocols", async () => {
  await assert.rejects(
    () => postJSON("file:///tmp/paper.json", {}),
    /Unsupported URL protocol: file:/,
  );
});

test("postJSON times out stalled requests", async () => {
  const server = await withServer((_req, _res) => {
    // Intentionally leave the request open.
  });

  try {
    await assert.rejects(
      () => postJSON(`${server.url}/paperclaw/generate`, {}, 25),
      /Request timed out after 0s/,
    );
  } finally {
    await server.close();
  }
});
