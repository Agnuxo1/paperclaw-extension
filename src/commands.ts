import * as vscode from "vscode";
import { postJSON } from "./api-bridge";
import {
  buildGenerateRequest,
  extractMarkdownTitle,
  normalizeTags,
  validateDescription,
} from "./paperclaw-core";

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

export interface PaperClawRuntime {
  clientId: string;
  postJson: typeof postJSON;
}

const LAST_PAPER_KEY = "paperclaw.lastPaperUrl";
let outputChannel: vscode.OutputChannel | undefined;

export function activatePaperClawCommands(
  context: vscode.ExtensionContext,
  runtime: PaperClawRuntime,
): void {
  outputChannel = vscode.window.createOutputChannel("PaperClaw");
  context.subscriptions.push(outputChannel);
  log(`PaperClaw ${context.extension.packageJSON.version} activated (client=${runtime.clientId})`);

  context.subscriptions.push(
    vscode.commands.registerCommand("paperclaw.publishProject", () => publishFlow(context, runtime)),
    vscode.commands.registerCommand("paperclaw.publishFromReadme", () => publishFromReadme(context, runtime)),
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

export function deactivatePaperClawCommands(): void {
  outputChannel?.dispose();
  outputChannel = undefined;
}

async function publishFlow(
  context: vscode.ExtensionContext,
  runtime: PaperClawRuntime,
): Promise<void> {
  const description = await vscode.window.showInputBox({
    title: "PaperClaw - describe your project",
    prompt: "In 1-3 sentences, describe what you are building. PaperClaw will turn this into a paper on p2pclaw.com.",
    placeHolder: "A peer-to-peer reputation system using verifiable delay functions.",
    ignoreFocusOut: true,
    validateInput: validateDescription,
  });
  if (!description) return;
  await runGenerate(context, runtime, description.trim(), { source: "inputbox" });
}

async function publishFromReadme(
  context: vscode.ExtensionContext,
  runtime: PaperClawRuntime,
): Promise<void> {
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

  await runGenerate(context, runtime, readme.slice(0, 4000), {
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
  runtime: PaperClawRuntime,
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

  const tags = normalizeTags(config.get<string>("tags", "").trim());
  const apiBase = config
    .get<string>("apiBase", "https://p2pclaw-mcp-server-production-ac1c.up.railway.app")
    .replace(/\/$/, "");

  log(`generate -> ${apiBase}/paperclaw/generate author="${author}" source=${opts.source} chars=${description.length}`);

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "PaperClaw", cancellable: false },
    async (progress) => {
      progress.report({ message: "Sending to P2PCLAW..." });
      let response: GenerateResponse;
      try {
        response = await runtime.postJson<GenerateResponse>(
          `${apiBase}/paperclaw/generate`,
          buildGenerateRequest(description, author, opts.title, tags, runtime.clientId),
        );
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
      const printLabel = "Save as PDF";
      const choice = await vscode.window.showInformationMessage(
        `PaperClaw: "${response.title ?? "Untitled"}" published (${response.wordCount ?? "?"} words${
          response.llm?.provider ? `, via ${response.llm.provider}` : ""
        }).`,
        openLabel,
        copyLabel,
        printLabel,
      );

      if (choice === copyLabel) {
        await vscode.env.clipboard.writeText(response.url);
        void vscode.window.showInformationMessage("PaperClaw: link copied to clipboard.");
        return;
      }
      if (choice === printLabel) {
        void vscode.env.openExternal(vscode.Uri.parse(`${response.url}#print`));
        return;
      }
      if (choice === openLabel || config.get<boolean>("openInBrowser", true)) {
        void vscode.env.openExternal(vscode.Uri.parse(response.url));
      }
    },
  );
}

function log(line: string): void {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  outputChannel?.appendLine(`[${ts}] ${line}`);
}
