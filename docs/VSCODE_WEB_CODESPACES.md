# VS Code Web and GitHub Codespaces Support

This document tracks the work needed to make PaperClaw run in browser-hosted VS Code environments such as GitHub Codespaces, vscode.dev, and github.dev.

Related issue: https://github.com/Agnuxo1/paperclaw-extension/issues/1

## Goal

PaperClaw should keep the desktop workflow while adding a web-extension path that avoids Node-only APIs and works from a browser extension host.

Supported target matrix:

| Target | Expected mode | Notes |
|---|---|---|
| VS Code desktop | Node extension host | Current primary target. |
| Cursor / Windsurf / VSCodium | Node extension host | Same extension behavior as VS Code desktop. |
| GitHub Codespaces | Web extension host when running in browser | Must avoid direct filesystem and Node HTTP assumptions. |
| vscode.dev / github.dev | Web extension host | Must use browser-safe APIs only. |

## Architecture

PaperClaw now uses two small compatibility layers instead of branching throughout commands:

| File | Responsibility |
|---|---|
| `src/api-bridge.ts` | Wrap HTTP calls to the P2PCLAW API. Use `fetch` when available and keep request/response validation in one place. |
| `src/web-extension.ts` | Browser extension entrypoint that registers the same commands but uses web-safe services. |

The existing desktop entrypoint should keep using the same command names. Shared command logic should accept injected services:

```ts
export interface PaperClawRuntime {
  apiBase: string;
  readWorkspaceReadme(): Promise<string | undefined>;
  openExternal(url: string): Promise<void>;
  postJson<T>(path: string, body: unknown): Promise<T>;
}
```

## Web-Safe Rules

- Use `vscode.workspace.fs` instead of Node `fs`.
- Use `fetch` instead of Node `http`, `https`, or `axios` if the bundler pulls Node polyfills.
- Use `vscode.env.openExternal(vscode.Uri.parse(url))` for browser navigation.
- Do not depend on local shell commands.
- Do not read arbitrary workspace files; keep README-based publishing explicit.
- Keep secrets out of settings and request bodies.

## Implementation Checklist

- [x] Create `src/api-bridge.ts` with a `postJSON` helper and explicit timeout/error handling.
- [x] Create `src/web-extension.ts` with the same command registrations as desktop.
- [ ] Move command logic into a shared module that accepts a `PaperClawRuntime` object.
- [x] Update `package.json` with a browser entrypoint if the extension build supports it.
- [x] Keep `extensionKind` limited to VS Code Marketplace values (`workspace`, `ui`); web support is provided by the `browser` entrypoint.
- [ ] Verify `PaperClaw: Publish Project as Research Paper` in Codespaces browser mode.
- [x] Verify `PaperClaw: Publish Paper from README.md` uses `vscode.workspace.fs`.
- [ ] Document any backend CORS requirements for `paperclaw.apiBase`.
- [x] Add automated tests for `src/api-bridge.ts` request validation and error handling.

## Acceptance Criteria

A web-compatible release is ready when:

- the extension activates in a browser-hosted VS Code session,
- all PaperClaw commands appear in the command palette,
- publishing a typed description returns a P2PCLAW paper URL,
- README publishing works without Node `fs`,
- no source files beyond the chosen README are uploaded,
- failures show actionable VS Code error messages.

## Test Plan

Manual smoke tests:

1. Open the repository in GitHub Codespaces from a browser.
2. Install the development extension build.
3. Run `PaperClaw: Open p2pclaw.com Dashboard`.
4. Run `PaperClaw: Publish Project as Research Paper` with a one-sentence test project.
5. Confirm the returned URL opens in the browser.
6. Add a small README and run `PaperClaw: Publish Paper from README.md`.

Automated checks:

- `npm test` compiles the extension and runs Node tests for `api-bridge.ts`.
- Covered: successful JSON POST, server error envelopes, malformed JSON, unsupported URL protocols, and stalled-request timeout handling.
- `npm run package` compiles and packages a VSIX containing `dist/extension.js`, `dist/web-extension.js`, and `dist/api-bridge.js`.

Automated checks still to add:

- mocked `vscode.workspace.fs` tests for README loading,
- command registration tests for desktop and web entrypoints.

## Backend Notes

The P2PCLAW API should allow browser-origin requests from supported VS Code web origins. If CORS blocks requests, the extension should show a clear message naming the configured `paperclaw.apiBase` and the failing origin.
