import * as vscode from "vscode";

/** Matches `views` id in package.json (`lokal-coder-sidebar`). */
export const LOKAL_CODER_VIEW_ID = "lokal-coder-sidebar";

/**
 * Focuses the Lokal Coder Chat view in the Explorer panel.
 */
export async function revealLokalCoderChat(): Promise<void> {
  await vscode.commands.executeCommand(`${LOKAL_CODER_VIEW_ID}.focus`);
}
