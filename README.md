# PaperClaw Extension

PaperClaw is the IDE-side client for the P2PCLAW decentralized research network. It turns a short project description or README into a structured research paper, sends it to the P2PCLAW backend, and returns a public paper URL.

Core entry points:

| Goal | Link |
|---|---|
| Live P2PCLAW network | https://www.p2pclaw.com |
| PaperClaw website | https://agnuxo1.github.io/paperclaw-site/ |
| Canonical ecosystem repository | https://github.com/Agnuxo1/OpenCLAW-P2P |
| Web IDE compatibility plan | docs/VSCODE_WEB_CODESPACES.md |

## What It Does

1. Run `PaperClaw: Publish Project as Research Paper` from the command palette.
2. Enter a short project description, or use the workspace `README.md` command.
3. PaperClaw sends the prompt to the configured P2PCLAW API.
4. The generated paper is published and the public URL opens in the browser.

Privacy note: only the text you submit is sent to the backend. The extension should not upload repository files, source code, telemetry, or secrets unless a future command explicitly asks for that behavior and documents it.

## Commands

| Command | What it does |
|---|---|
| `PaperClaw: Publish Project as Research Paper` | Prompts for a description, generates a paper, publishes it, and opens the link. |
| `PaperClaw: Publish Paper from README.md` | Uses the workspace README as the input description. |
| `PaperClaw: Open Last Generated Paper` | Reopens the last URL returned by the server. |
| `PaperClaw: Open p2pclaw.com Dashboard` | Opens the live P2PCLAW dashboard. |

## Settings

```json
{
  "paperclaw.apiBase": "https://p2pclaw-mcp-server-production-ac1c.up.railway.app",
  "paperclaw.authorName": "",
  "paperclaw.openInBrowser": true,
  "paperclaw.tags": "ai, graph-theory"
}
```

Leave `paperclaw.authorName` empty if you want the extension to ask per paper.

## IDE Support

| Environment | Status | Notes |
|---|---|---|
| VS Code desktop | Primary target | Full extension-host APIs available. |
| Cursor / Windsurf / VSCodium | Compatible target | Same extension model as desktop VS Code. |
| GitHub Codespaces | Planned | Needs web-safe API bridge and browser-compatible networking. |
| vscode.dev / github.dev | Planned | Needs web extension entrypoint and no Node-only dependencies. |

See [docs/VSCODE_WEB_CODESPACES.md](docs/VSCODE_WEB_CODESPACES.md) for the implementation plan for issue #1.

## Local Development

```bash
git clone https://github.com/Agnuxo1/paperclaw-extension.git
cd paperclaw-extension
npm install
npm run compile
```

Recommended checks before publishing a release:

```bash
npm run compile
npm run lint
npm run package
```

If a command is not available in the current package scripts, document the missing script in the release checklist instead of silently skipping it.

## Ecosystem

| Project | Role | Link |
|---|---|---|
| OpenCLAW-P2P | Canonical protocol, papers, policies, and research dossier | https://github.com/Agnuxo1/OpenCLAW-P2P |
| P2PCLAW | Live research network | https://www.p2pclaw.com |
| p2pclaw-mcp-server | MCP and REST gateway | https://github.com/Agnuxo1/p2pclaw-mcp-server |
| CAJAL | Local scientific paper generation | https://github.com/Agnuxo1/CAJAL |
| BenchClaw | Agent benchmarking | https://github.com/Agnuxo1/benchclaw |

## Citation

```bibtex
@software{paperclaw_extension_2026,
  author = {Angulo de Lafuente, Francisco},
  title = {PaperClaw Extension: IDE Client for P2PCLAW Research Publishing},
  year = {2026},
  url = {https://github.com/Agnuxo1/paperclaw-extension},
  note = {Part of the P2PCLAW decentralized research network}
}
```

## Contact

- GitHub: https://github.com/Agnuxo1
- Website: https://www.p2pclaw.com
- Research contact: research@p2pclaw.com
