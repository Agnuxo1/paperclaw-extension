import * as vscode from "vscode";
import { postJSON } from "./api-bridge";
import { activatePaperClawCommands, deactivatePaperClawCommands } from "./commands";

export function activate(context: vscode.ExtensionContext): void {
  activatePaperClawCommands(context, {
    clientId: "paperclaw-vscode-web",
    postJson: postJSON,
  });
}

export function deactivate(): void {
  deactivatePaperClawCommands();
}
