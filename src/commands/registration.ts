import * as vscode from "vscode";
import { ServiceContainer } from "@core/container";
import { Logger } from "@core/logger";
import { revealLokalCoderChat } from "@commands/revealChat";
import { ChatPersistenceService } from "@chat/chatPersistenceService";
import { ChatWebviewProvider } from "@webview/webviewProvider";

export function registerCommands(context: vscode.ExtensionContext) {
  const logger = ServiceContainer.getInstance().resolve<Logger>("Logger");

  const startChat = vscode.commands.registerCommand("lokal-coder.startChat", async () => {
    logger.info("Command lokal-coder.startChat triggered.");
    await revealLokalCoderChat();
  });

  const clearHistory = vscode.commands.registerCommand("lokal-coder.clearHistory", async () => {
    logger.info("Command lokal-coder.clearHistory triggered.");
    ChatWebviewProvider.postToWebview({ type: "resetChat" });
    try {
      const persistence =
        ServiceContainer.getInstance().resolve<ChatPersistenceService>("ChatPersistenceService");
      if (await persistence.isConfigured()) {
        const wk = persistence.getWorkspaceKey();
        if (wk) {
          const router = ServiceContainer.getInstance().resolve<any>("MessageRouter");
          const uid = router.getCurrentUserId();
          const sid = await persistence.getOrCreateSession(wk, uid);
          if (sid) {
            await persistence.clearMessages(sid);
          }
        }
      }
    } catch (e: any) {
      logger.error(`clearHistory persist: ${e?.message || e}`);
    }
    vscode.window.showInformationMessage("Chat history cleared.");
  });

  context.subscriptions.push(startChat, clearHistory);
}
