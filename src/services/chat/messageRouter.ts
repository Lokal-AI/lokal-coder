import { ChatPersistenceService } from "@chat/chatPersistenceService";
import { ContextService } from "@chat/contextService";
import { ServiceContainer } from "@core/container";
import { Logger } from "@core/logger";
import { FileService } from "@file-service/fileService";
import { OllamaService } from "@llms/ollamaService";
import { SendMessagePayload, WebviewMessage } from "@lokal-types/messages";
import { ChatWebviewProvider } from "@webview/webviewProvider";
import * as vscode from "vscode";
import { Layer0Agent } from "../agentic/layer0Agent";

export class MessageRouter {
  private logger: Logger;
  private ollama: OllamaService;
  private contextService: ContextService;
  private fileService: FileService;
  private activeControllers: Map<string, AbortController> = new Map();
  private chatPersistence: ChatPersistenceService;
  private assistantStreamAcc = new Map<string, { content: string; thought: string }>();
  private persistedSessionId: string | null = null;
  private currentUserId: string | null = null;
  private context: vscode.ExtensionContext;
  private layer0: Layer0Agent;

  public getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  constructor() {
    const container = ServiceContainer.getInstance();
    this.logger = container.resolve<Logger>("Logger");
    this.ollama = container.resolve<OllamaService>("OllamaService");
    this.contextService = container.resolve<ContextService>("ContextService");
    this.fileService = container.resolve<FileService>("FileService");
    this.chatPersistence = container.resolve<ChatPersistenceService>("ChatPersistenceService");
    this.context = container.resolve<vscode.ExtensionContext>("Context");
    this.layer0 = new Layer0Agent();

    // Restore persistent identity
    const savedUser = this.context.workspaceState.get<string>("currentUserId");
    if (savedUser) {
      this.currentUserId = savedUser;
      this.logger.info(`👤 Restored persistent user identity: ${savedUser}`);
    }
  }

  public async handle(message: WebviewMessage, webview: vscode.Webview): Promise<void> {
    this.logger.info(`Message received from webview: ${message.command}`);

    switch (message.command) {
      case "reload":
        await ChatWebviewProvider.refresh();
        break;

      case "onReady":
        await this.handleOnReady(webview);
        break;

      case "listModels":
        await this.handleListModels(webview);
        break;

      case "sendMessage":
        await this.handleSendMessage(message.payload as SendMessagePayload, webview);
        break;

      case "cancelRequest":
        this.handleCancelRequest(message.payload as { id: string });
        break;

      case "createSession":
        await this.handleCreateSession(webview);
        break;

      case "openSettings":
        await this.handleOpenSettings();
        break;

      case "revealInExplorer":
        vscode.commands.executeCommand("lokal-coder.clearHistory");
        break;

      case "clearHistory":
        vscode.commands.executeCommand("lokal-coder.clearHistory");
        break;

      case "showInformation":
        vscode.window.showInformationMessage(message.payload);
        break;

      case "listWorkspaceItems":
        await this.handleListWorkspaceItems(message.payload, webview);
        break;

      case "openFile":
        await this.handleOpenFile(message.payload);
        break;

      case "persistAssistantTurn":
        await this.handlePersistAssistantTurn(
          message.payload as {
            requestId: string;
            record: { role?: string; content?: string; payload?: Record<string, unknown> };
          },
          webview
        );
        break;

      case "setUser":
        await this.handleSetUser(message.payload as { userId: string }, webview);
        break;

      case "listSessions":
        await this.handleListSessions(webview);
        break;

      case "loadSession":
        await this.handleLoadSession(message.payload as { sessionId: string }, webview);
        break;

      case "deleteSession":
        await this.handleDeleteSession(message.payload as { sessionId: string }, webview);
        break;

      case "clearSession":
        await this.handleClearSession(message.payload as { sessionId: string }, webview);
        break;

      default:
        this.logger.error(`Unknown command received: ${message.command}`);
    }
  }

  private async handleClearSession(payload: { sessionId: string }, webview: vscode.Webview) {
    try {
      const { sessionId } = payload;
      this.logger.info(`Cleaning messages for session: ${sessionId}`);
      await this.chatPersistence.clearMessages(sessionId);
      if (this.persistedSessionId === sessionId) {
        await this.handleOnReady(webview);
      } else {
        await this.handleListSessions(webview);
      }
    } catch (error: any) {
      this.logger.error(`Failed to clear session: ${error.message}`);
      webview.postMessage({
        type: "globalError",
        payload: {
          message: "Could not clear conversation history.",
          details: error.message,
        },
      });
    }
  }

  private async handlePostToWebview(
    payload: { message: string; data?: any },
    _webview: vscode.Webview
  ) {
    this.logger.info(`Forwarding message to webview: ${payload.message}`);
  }

  private async handleSendMessage(
    payload: SendMessagePayload,
    webview: vscode.Webview
  ): Promise<void> {
    const { text, model, mentions } = payload;
    const requestId =
      payload.requestId?.trim() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const userId = `${requestId}-user`;
    const assistantId = requestId;

    // 1. Establish session immediately before sending user message to UI
    const sessionId = await this.getPersistSessionId();
    if (sessionId) {
      // If we have a session, ensure webview is pinned to it
      // We don't send the full history here, just the ID sync
      webview.postMessage({
        type: "chatHistory",
        payload: {
          messages: null,
          sessionId,
          workspaceKey: this.chatPersistence.getWorkspaceKey(),
        },
      });
    }

    this.assistantStreamAcc.set(assistantId, { content: "", thought: "" });

    this.logger.info(
      `Processing message in Fast Plan mode (request ${requestId}): ${text.slice(0, 80)}`
    );

    const controller = new AbortController();
    this.activeControllers.set(requestId, controller);

    webview.postMessage({
      type: "updateMessages",
      payload: { id: userId, role: "user", content: text, mentions: mentions },
    });

    try {
      const enrichedText = await this.resolveMentions(text, mentions);
      this.logger.info(`Enriched prompt generated (${enrichedText.length} chars).`);

      const sessionId = await this.getPersistSessionId();

      const result = await this.layer0.run(
        enrichedText,
        sessionId || "default-thread",
        (chunk) => {
          this.recordAssistantChunk(assistantId, "content", chunk);
          webview.postMessage({ type: "streamChunk", id: assistantId, payload: chunk });
        },
        (verb, detail) => {
          webview.postMessage({
            type: "activityLine",
            id: assistantId,
            payload: { verb, detail },
          });
        },
        controller.signal
      );

      if (result.isActionable) {
        const msg =
          "\n\n> [!NOTE]\n> This request has been identified as a **Coding Task**. I am ready to transition to the **Planning Phase** (Layer 1) once the next layer is active.";
        this.recordAssistantChunk(assistantId, "content", msg);
        webview.postMessage({ type: "streamChunk", id: assistantId, payload: msg });
      }
    } catch (_error: any) {
      if (_error.name === "AbortError") {
        this.logger.info("Request aborted by user.");
      } else {
        this.logger.error(`Error in Layer 0: ${_error.message}`);
        webview.postMessage({
          type: "globalError",
          payload: {
            message: "The AI model encountered an error during request processing.",
            details: _error.message,
          },
        });
      }
    } finally {
      this.activeControllers.delete(requestId);
      await this.persistUserTurn(requestId, text, mentions);
      await this.persistAssistantFromAccumulator(assistantId);
      webview.postMessage({
        type: "streamEnd",
        id: assistantId,
        persistAgentSnapshot: false,
      });
    }
  }

  private recordAssistantChunk(
    assistantId: string,
    field: "content" | "thought",
    chunk: string
  ): void {
    if (!chunk) {
      return;
    }
    const acc = this.assistantStreamAcc.get(assistantId) || { content: "", thought: "" };
    acc[field] += chunk;
    this.assistantStreamAcc.set(assistantId, acc);
  }

  private async getPersistSessionId(): Promise<string | null> {
    if (!(await this.chatPersistence.isConfigured())) {
      return null;
    }
    if (this.persistedSessionId) {
      return this.persistedSessionId;
    }
    const wk = this.chatPersistence.getWorkspaceKey();
    if (!wk) {
      return null;
    }
    const sid = await this.chatPersistence.getOrCreateSession(wk, this.currentUserId || undefined);
    if (!sid) {
      return null;
    }
    this.persistedSessionId = sid;
    return sid;
  }

  private async handleSetUser(payload: { userId: string }, webview: vscode.Webview) {
    try {
      const newUserId = payload.userId || null;
      this.logger.info(`📥 Received setUser message: userId=${newUserId || "NULL"}`);

      if (!newUserId) {
        this.logger.info("👤 User logout signal: Clearing session state.");
        this.currentUserId = null;
        this.persistedSessionId = null;
        await this.context.workspaceState.update("currentUserId", null);

        // Clear webview state explicitly
        webview.postMessage({
          type: "chatHistory",
          payload: { messages: [], sessionId: null },
        });
        return;
      }

      // Persist for reloads
      await this.context.workspaceState.update("currentUserId", newUserId);
      this.logger.info(`💾 User identity persisted to workspaceState: ${newUserId}`);

      if (this.currentUserId !== newUserId || !this.persistedSessionId) {
        this.currentUserId = newUserId;
        this.persistedSessionId = null;
        this.logger.info(`👤 User sync confirmed: ${newUserId}`);

        // PROACTIVE: Resolve session immediately upon user set
        const sessionId = await this.getPersistSessionId();
        if (sessionId) {
          this.logger.info(`✅ Proactively synced session ${sessionId} for user ${newUserId}`);
          webview.postMessage({
            type: "chatHistory",
            payload: {
              messages: null,
              sessionId,
              workspaceKey: this.chatPersistence.getWorkspaceKey(),
            },
          });
        }

        await this.handleOnReady(webview);
      }
    } catch (error: any) {
      this.logger.error(`Error in handleSetUser: ${error.message}`);
      webview.postMessage({
        type: "globalError",
        payload: {
          message: "Failed to establish user session. Please check your Supabase configuration.",
          details: error.message,
        },
      });
    }
  }

  private async persistUserTurn(requestId: string, text: string, mentions?: any[]): Promise<void> {
    const sessionId = await this.getPersistSessionId();
    if (!sessionId) {
      return;
    }
    await this.chatPersistence.appendMessage(
      sessionId,
      "user",
      text ?? "",
      { mentions: Array.isArray(mentions) ? mentions : [] },
      `${requestId}-user`
    );
  }

  private async persistAssistantFromAccumulator(assistantId: string): Promise<void> {
    const sessionId = await this.getPersistSessionId();
    if (!sessionId) {
      return;
    }
    const acc = this.assistantStreamAcc.get(assistantId);
    this.assistantStreamAcc.delete(assistantId);
    if (!acc) {
      return;
    }
    const content = (acc.content || "").trim();
    const thought = (acc.thought || "").trim();
    if (!content && !thought) {
      return;
    }
    await this.chatPersistence.appendMessage(
      sessionId,
      "assistant",
      content,
      { thought },
      assistantId
    );
  }

  private async handlePersistAssistantTurn(
    payload: {
      requestId: string;
      record: { role?: string; content?: string; payload?: Record<string, unknown> };
    },
    _webview: vscode.Webview
  ): Promise<void> {
    const sessionId = await this.getPersistSessionId();
    if (!sessionId) {
      return;
    }
    const role = payload?.record?.role === "system" ? "system" : "assistant";
    const content = typeof payload?.record?.content === "string" ? payload.record.content : "";
    const msgPayload =
      payload?.record?.payload && typeof payload.record.payload === "object"
        ? payload.record.payload
        : {};
    await this.chatPersistence.appendMessage(
      sessionId,
      role,
      content,
      msgPayload,
      payload?.requestId
    );
  }

  private async resolveMentions(text: string, mentions?: any[]): Promise<string> {
    let enrichedText = text;
    const processedPaths = new Set<string>();
    if (mentions) {
      for (const mention of mentions) {
        const path = mention.relativePath || mention.name;
        if (processedPaths.has(path)) {
          continue;
        }
        processedPaths.add(path);
        try {
          const content = await this.fileService.readFile(path);
          enrichedText += `\n\n[MENTIONED FILE: ${path}]\n${content}\n[END MENTION]`;
        } catch {
          /* ignore failed read for mention */
        }
      }
    }
    return enrichedText;
  }

  private async handleOpenFile(payload: { path: string }) {
    try {
      const folder = vscode.workspace.workspaceFolders?.[0];
      if (!folder) {
        return;
      }
      const uri = vscode.Uri.joinPath(folder.uri, payload.path);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);
    } catch (error: any) {
      this.logger.error(`Failed to open file: ${error.message}`);
    }
  }

  private async handleListWorkspaceItems(
    payload: { type: "file" | "folder" | "all" },
    webview: vscode.Webview
  ) {
    try {
      const items = await this.fileService.getWorkspaceItems(payload.type || "all");
      webview.postMessage({ type: "workspaceItems", payload: items });
    } catch (error: any) {
      this.logger.error(`Failed to list workspace items: ${error.message}`);
    }
  }

  private handleCancelRequest(payload: { id: string }) {
    const id = typeof payload?.id === "string" ? payload.id : String(payload?.id ?? "");
    const controller = this.activeControllers.get(id);
    if (controller) {
      controller.abort();
      this.activeControllers.delete(id);
    }
  }

  private async handleOnReady(webview: vscode.Webview) {
    try {
      await this.handleListModels(webview);

      // If no user is identified, we return an empty state to the webview
      // This forces the webview to stay on the login page or wait for setUser
      if (!this.currentUserId) {
        this.logger.info("Syncing empty history for unauthenticated user.");
        webview.postMessage({ type: "chatHistory", payload: { messages: [], sessionId: null } });
        return;
      }

      if (!(await this.chatPersistence.isConfigured())) {
        webview.postMessage({ type: "chatHistory", payload: { messages: [] } });
        return;
      }
      const wk = this.chatPersistence.getWorkspaceKey();
      if (!wk) {
        webview.postMessage({ type: "chatHistory", payload: { messages: [] } });
        return;
      }
      const sessionId = await this.chatPersistence.getOrCreateSession(
        wk,
        this.currentUserId || undefined
      );
      if (!sessionId) {
        webview.postMessage({ type: "chatHistory", payload: { messages: [] } });
        return;
      }
      this.persistedSessionId = sessionId;
      const rows = await this.chatPersistence.loadMessages(sessionId);
      const messages = await Promise.all(
        rows.map((r) => this.chatPersistence.rowToWebviewMessage(r))
      );
      webview.postMessage({
        type: "chatHistory",
        payload: { messages, sessionId, workspaceKey: wk },
      });
    } catch (error: any) {
      this.logger.error(`Error in handleOnReady: ${error.message}`);
      webview.postMessage({
        type: "globalError",
        payload: {
          message:
            "Failed to initialize chat session. This often happens if the local database is locked or corrupted.",
          details: error.message,
        },
      });
    }
  }

  private async handleListSessions(webview: vscode.Webview) {
    const wk = this.chatPersistence.getWorkspaceKey();
    const userId = this.currentUserId;
    this.logger.info(`Listing sessions. User: ${userId || "NONE"}, Workspace: ${wk || "NONE"}`);

    if (!userId) {
      this.logger.warn("Cannot list sessions: No authenticated user identified.");
      webview.postMessage({
        type: "sessionsList",
        payload: { sessions: [], currentWorkspaceKey: wk },
      });
      return;
    }

    const sessions = await this.chatPersistence.listSessions(wk || "", userId);
    this.logger.info(`Found ${sessions.length} sessions for user ${userId}`);
    webview.postMessage({ type: "sessionsList", payload: { sessions, currentWorkspaceKey: wk } });
  }

  private async handleLoadSession(payload: { sessionId: string }, webview: vscode.Webview) {
    const { sessionId } = payload;
    this.persistedSessionId = sessionId;
    const rows = await this.chatPersistence.loadMessages(sessionId);
    const messages = await Promise.all(
      rows.map((r) => this.chatPersistence.rowToWebviewMessage(r))
    );
    webview.postMessage({ type: "chatHistory", payload: { messages, sessionId } });
  }

  private async handleDeleteSession(payload: { sessionId: string }, webview: vscode.Webview) {
    const { sessionId } = payload;
    await this.chatPersistence.deleteSession(sessionId);
    if (this.persistedSessionId === sessionId) {
      this.persistedSessionId = null;
      await this.handleOnReady(webview);
    } else {
      await this.handleListSessions(webview);
    }
  }

  private async handleCreateSession(webview: vscode.Webview) {
    const wk = this.chatPersistence.getWorkspaceKey();
    const userId = this.currentUserId;
    if (!wk || !userId) {
      this.logger.error("Cannot create session: Workspace or User ID missing.");
      return;
    }

    this.logger.info(`Creating fresh session for user ${userId} in ${wk}`);
    const sessionId = await this.chatPersistence.createNewSession(wk, userId);
    if (sessionId) {
      this.persistedSessionId = sessionId;
      // Inform webview of the new session ID and reset messages in one go
      webview.postMessage({
        type: "chatHistory",
        payload: { messages: [], sessionId, workspaceKey: wk },
      });
      // Refresh history list if open
      await this.handleListSessions(webview);
    }
  }

  private async handleOpenSettings() {
    this.logger.info("Opening extension settings.");
    await vscode.commands.executeCommand("workbench.action.openSettings", "lokal-coder");
  }

  private async handleListModels(webview: vscode.Webview) {
    try {
      const models = await this.ollama.listModels();
      webview.postMessage({ type: "listModelsUpdate", payload: models });
    } catch (_error) {
      webview.postMessage({ type: "listModelsError", payload: "Ollama Error" });
    }
  }
}
