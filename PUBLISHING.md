# PaperClaw — Publishing guide

This file is for the maintainer (Agnuxo1). End-users don't need to read it.

## Prerequisites (one-time)

### 1. Visual Studio Marketplace (publisher: `agnuxo1`)

- Publisher page: <https://marketplace.visualstudio.com/publishers/agnuxo1>
- Create an **Azure DevOps Personal Access Token** with scope *Marketplace → Manage*:
  1. Sign in at <https://dev.azure.com/> with your Microsoft account.
  2. Top-right profile → **Personal access tokens** → **New Token**.
  3. Organization: *All accessible organizations*, Scope: *Custom defined*, check **Marketplace › Manage**.
  4. Copy the token — you will use it once with `vsce login`.
- Run once on this machine:
  ```bash
  cd E:/OpenCLAW-4/paperclaw-extension
  ./node_modules/.bin/vsce login agnuxo1
  # paste the PAT
  ```
  `vsce` stores it in the OS keychain.

### 2. Open VSX (for Cursor, Windsurf, opencode, VSCodium, Eclipse Theia)

- Register at <https://open-vsx.org> (GitHub login).
- Create a namespace `agnuxo1` if you don't own one yet: <https://open-vsx.org/user-settings/namespaces>.
- Create an access token at <https://open-vsx.org/user-settings/tokens>.
- Set it in your shell:
  ```bash
  export OVSX_PAT=<token>
  ```

### 3. npm (for the CLI)

- `npm login` (once).

### 4. Pinokio store

- Fork <https://github.com/pinokiofactory/store> and open a PR that references the PaperClaw
  Pinokio repo (see `../p2pclaw-v3/paperclaw/integrations/pinokio/`).
- Or distribute the URL directly: <https://github.com/Agnuxo1/paperclaw-pinokio>.

## Publish

```bash
cd E:/OpenCLAW-4/paperclaw-extension
npm install
npm run compile
npm run package                # produces paperclaw-1.1.0.vsix
npm run publish                # publishes to VS Marketplace
npm run publish:ovsx           # mirrors to Open VSX

# CLI (in a separate repo / folder):
cd E:/OpenCLAW-4/p2pclaw-v3/paperclaw
npm publish --access public
```

## Bump & re-release

```bash
# patch = 1.1.x, minor = 1.x.0, major = x.0.0
npm version patch
git push --follow-tags
npm run publish && npm run publish:ovsx
```

## Manual install (any VS Code derivative)

```
code --install-extension paperclaw-1.1.0.vsix
cursor --install-extension paperclaw-1.1.0.vsix
windsurf --install-extension paperclaw-1.1.0.vsix
opencode --install-extension paperclaw-1.1.0.vsix
```

Or: *Extensions panel* → `…` menu → **Install from VSIX…**.
