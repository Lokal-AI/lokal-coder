import * as vscode from "vscode";

export class Logger {
  private outputChannel: vscode.OutputChannel;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel("Lokal Coder Console");
  }

  public info(message: string): void {
    this.outputChannel.appendLine(`[INFO] ${new Date().toISOString()} - ${message}`);
  }

  public warn(message: string): void {
    this.outputChannel.appendLine(`[WARN] ${new Date().toISOString()} - ${message}`);
  }

  public error(message: string, error?: any): void {
    this.outputChannel.appendLine(`[ERROR] ${new Date().toISOString()} - ${message}`);
    if (error) {
      this.outputChannel.appendLine(JSON.stringify(error, null, 2));
    }
  }

  public show(): void {
    this.outputChannel.show();
  }

  public dispose(): void {
    this.outputChannel.dispose();
  }
}
