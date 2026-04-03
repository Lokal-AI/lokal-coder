import * as vscode from "vscode";
import { ServiceContainer } from "./core/container";
import { Logger } from "./core/logger";
import { MessageRouter } from "@chat/messageRouter";
import { OllamaService } from "@llms/ollamaService";
import { FileService } from "@file-service/fileService";
import { ChatWebviewProvider } from "@webview/webviewProvider";
import { registerCommands } from "@commands/registration";
import { revealLokalCoderChat } from "@commands/revealChat";
import { ContextService } from "@chat/contextService";
import { ChatPersistenceService } from "@chat/chatPersistenceService";
import { ConfigService } from "@config/configService";

export async function activate(context: vscode.ExtensionContext) {
  const container = ServiceContainer.getInstance();

  // Initialize Core Services
  const logger = new Logger();
  try {
    // fs.rmSync(distPath, { recursive: true, force: true });
  } catch {
    /* ignored */
  }
  logger.info("Initializing Lokal Coder Agent Extension...");

  container.register("Logger", logger);
  container.register("Context", context);

  const configService = new ConfigService(logger);
  await configService.waitForReady();
  container.register("ConfigService", configService);

  // Initialize Services (Phase 1 & 2)
  const ollama = new OllamaService();
  container.register("OllamaService", ollama);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration("lokal-coder")) {
        await configService.refresh();
        ollama.refreshClient();
      }
    })
  );

  const contextService = new ContextService(logger);
  container.register("ContextService", contextService);

  // Initialize Agent Services (Phase 3)

  const file = new FileService();
  container.register("FileService", file);

  const chatPersistence = new ChatPersistenceService(logger);
  container.register("ChatPersistenceService", chatPersistence);

  // Initialize Message Router
  const messageRouter = new MessageRouter();
  container.register("MessageRouter", messageRouter);

  // Initialize Webview Provider
  const webviewProvider = new ChatWebviewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ChatWebviewProvider.viewType, webviewProvider)
  );

  // Register Extension Commands
  registerCommands(context);

  // After moving chat to the explorer, reveal once so existing users discover the new location
  const revealOnceKey = "lokalCoder.revealExplorerV1";
  if (!context.globalState.get(revealOnceKey)) {
    void revealLokalCoderChat()
      .then(() => context.globalState.update(revealOnceKey, true))
      .catch(() => {
        logger.warn(
          "First-run: could not open explorer chat (use Command Palette: Lokal Coder: Focus Chat View)."
        );
      });
  }

  // Diagnostic Search Test Command
  context.subscriptions.push(
    vscode.commands.registerCommand("lokal-coder.testScanner", async () => {
      const fs = container.resolve<FileService>("FileService");
      const logger = container.resolve<Logger>("Logger");
      logger.info("🧪 Testing Workspace Scanner...");
      const items = await fs.getWorkspaceItems("all");
      console.warn("Detect items:", items);
      vscode.window.showInformationMessage(
        `Scanner found ${items.length} items. Check Developer Console!`
      );
    })
  );

  logger.info("Lokal Coder Agent Activation successful. ✨");
}

export function deactivate() {
  const logger = ServiceContainer.getInstance().resolve<Logger>("Logger");
  logger.info("Deactivating Lokal Coder Agent Extension...");
  logger.dispose();
}
