import * as vscode from "vscode";
import { postJSON } from "./api-bridge";
import { activatePaperClawCommands, deactivatePaperClawCommands } from "./commands";

export function activate(context: vscode.ExtensionContext): void {
  activatePaperClawCommands(context, {
    clientId: resolveClientId(),
    postJson: postJSON,
  });
}

export function deactivate(): void {
  deactivatePaperClawCommands();
}

function resolveClientId(): string {
  const appName = (vscode.env.appName || "").toLowerCase();
  if (appName.includes("cursor")) return "paperclaw-cursor";
  if (appName.includes("windsurf")) return "paperclaw-windsurf";
  if (appName.includes("opencode")) return "paperclaw-opencode";
  if (appName.includes("antigravity")) return "paperclaw-antigravity";
  if (appName.includes("vscodium")) return "paperclaw-vscodium";
  if (appName.includes("visual studio code")) return "paperclaw-vscode";
  return "paperclaw-vscode-compatible";
}
