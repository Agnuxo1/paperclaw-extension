import * as vscode from "vscode";
import { postJSON } from "./api-bridge";

interface GenerateResponse {
  success: boolean;
  paperId?: string;
  url?: string;
  title?: string;
  author?: string;
  wordCount?: number;
  error?: string;
  message?: string;
  llm?: { provider?: string; model?: string };
}

const LAST_PAPER_KEY = "paperclaw.lastPaperUrl";
const CLIENT_ID = "paperclaw-vscode-web";

let outputChannel: vscode.OutputChannel | undefined;

export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel("PaperClaw");
  context.subscriptions.push(outputChannel);

  log(`PaperClaw ${context.extension.packageJSON.version} activated (web client)`);

  context.subscriptions.push(
    vscode.commands.registerCommand("paperclaw.publishProject", () => publishFlow(context)),
    vscode.commands.registerCommand("paperclaw.publishFromReadme", () => publishFromReadme(context)),
    vscode.commands.registerCommand("paperclaw.openDashboard", () => {
      void vscode.env.openExternal(vscode.Uri.parse("https://www.p2pclaw.com"));
    }),
    vscode.commands.registerCommand("paperclaw.openLastPaper", async () => {
      const last = context.globalState.get<string>(LAST_PAPER_KEY);
      if (!last) {
        void vscode.window.showInformationMessage("PaperClaw: no paper has been generated yet.");
        return;
      }
      void vscode.env.openExternal(vscode.Uri.parse(last));
    }),
  );
}

export function deactivate(): void {
  outputChannel?.dispose();
}

async function publishFlow(context: vscode.ExtensionContext): Promise<void> {
  const description = await vscode.window.showInputBox({
    title: "PaperClaw - describe your project",
    prompt:
      "In 1-3 sentences, describe what you are building. PaperClaw will turn this into a paper on p2pclaw.com.",
    placeHolder: "A peer-to-peer reputation system using verifiable delay functions.",
    ignoreFocusOut: true,
    validateInput: (value) => {
      const text = value.trim();
      if (text.length === 0) return null;
      if (text.length < 30) return `Add ${30 - text.length} more characters.`;
      if (text.length > 4000) return "Too long. Trim to under 4000 characters.";
      return null;
    },
  });
  if (!description) return;
  await runGenerate(context, description.trim(), { source: "inputbox" });
}

async function publishFromReadme(context: vscode.ExtensionContext): Promise<void> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    void vscode.window.showErrorMessage("PaperClaw: open a folder first.");
    return;
  }

  let readmeUri: vscode.Uri | undefined;
  for (const folder of folders) {
    const files = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, "README*.md"), null, 1);
    if (files.length > 0) {
      readmeUri = files[0];
      break;
    }
  }

  if (!readmeUri) {
    void vscode.window.showErrorMessage("PaperClaw: no README.md found in the workspace.");
    return;
  }

  const bytes = await vscode.workspace.fs.readFile(readmeUri);
  const readme = new TextDecoder("utf-8").decode(bytes).trim();
  if (readme.length < 80) {
    void vscode.window.showErrorMessage("PaperClaw: README.md is too short to use as a description.");
    return;
  }

  await runGenerate(context, readme.slice(0, 4000), {
    source: "readme",
    title: extractMarkdownTitle(readme) ?? undefined,
  });
}

interface GenerateOpts {
  source: string;
  title?: string;
}

async function runGenerate(
  context: vscode.ExtensionContext,
  description: string,
  opts: GenerateOpts,
): Promise<void> {
  const config = vscode.workspace.getConfiguration("paperclaw");
  let author = config.get<string>("authorName", "").trim();
  if (!author) {
    const asked = await vscode.window.showInputBox({
      title: "PaperClaw - author name",
      prompt: "Name to print on the paper",
      placeHolder: "Ada Lovelace",
      ignoreFocusOut: true,
    });
    if (!asked) return;
    author = asked.trim();
  }

  const rawTags = config.get<string>("tags", "").trim();
  const tags = rawTags
    ? rawTags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 10)
    : [];
  const apiBase = config
    .get<string>("apiBase", "https://p2pclaw-mcp-server-production-ac1c.up.railway.app")
    .replace(/\/$/, "");

  log(`generate -> ${apiBase}/paperclaw/generate author="${author}" source=${opts.source} chars=${description.length}`);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "PaperClaw",
      cancellable: false,
    },
    async (progress) => {
      progress.report({ message: "Sending to P2PCLAW..." });

      let response: GenerateResponse;
      try {
        response = await postJSON<GenerateResponse>(`${apiBase}/paperclaw/generate`, {
          description,
          author,
          title: opts.title,
          tags,
          client: CLIENT_ID,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        log(`error: ${message}`);
        void vscode.window.showErrorMessage(`PaperClaw: ${message}`);
        return;
      }

      if (!response.success || !response.url) {
        const message = response.message || response.error || "Unknown error";
        log(`server error: ${message}`);
        void vscode.window.showErrorMessage(`PaperClaw: ${message}`);
        return;
      }

      await context.globalState.update(LAST_PAPER_KEY, response.url);
      progress.report({ message: "Paper published" });

      const openLabel = "Open paper";
      const copyLabel = "Copy link";
      const choice = await vscode.window.showInformationMessage(
        `PaperClaw: "${response.title ?? "Untitled"}" published (${response.wordCount ?? "?"} words).`,
        openLabel,
        copyLabel,
      );

      if (choice === copyLabel) {
        await vscode.env.clipboard.writeText(response.url);
        void vscode.window.showInformationMessage("PaperClaw: link copied to clipboard.");
        return;
      }

      if (choice === openLabel || config.get<boolean>("openInBrowser", true)) {
        void vscode.env.openExternal(vscode.Uri.parse(response.url));
      }
    },
  );
}

function extractMarkdownTitle(markdown: string): string | null {
  const match = markdown.match(/^\s*#\s+(.+?)\s*$/m);
  return match ? match[1].trim() : null;
}

function log(line: string): void {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  outputChannel?.appendLine(`[${ts}] ${line}`);
}
