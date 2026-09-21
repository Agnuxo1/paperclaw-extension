const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildGenerateRequest,
  extractMarkdownTitle,
  normalizeTags,
  validateDescription,
} = require("../dist/paperclaw-core");

test("validateDescription enforces the documented input bounds", () => {
  assert.equal(validateDescription(""), null);
  assert.match(validateDescription("short"), /more characters/);
  assert.equal(validateDescription("a".repeat(30)), null);
  assert.match(validateDescription("a".repeat(4001)), /under 4000/);
});

test("core helpers normalize tags and extract a markdown title", () => {
  assert.deepEqual(normalizeTags(" ai, graph-theory, , security "), ["ai", "graph-theory", "security"]);
  assert.equal(extractMarkdownTitle("intro\n# A useful title\nbody"), "A useful title");
  assert.equal(extractMarkdownTitle("no heading"), null);
});

test("buildGenerateRequest defines one payload for desktop and web hosts", () => {
  assert.deepEqual(
    buildGenerateRequest("description", "author", "title", ["ai"], "paperclaw-vscode-web"),
    { description: "description", author: "author", title: "title", tags: ["ai"], client: "paperclaw-vscode-web" },
  );
});
