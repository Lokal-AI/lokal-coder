import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as vscode from "vscode";
import { Logger } from "../core/logger";

export interface PersistedMessageRow {
  id: string;
  session_id: string;
  role: string;
  content: string;
  payload: Record<string, unknown>;
  client_message_id: string | null;
  created_at: string;
  sort_index: number | null;
}

export class ChatPersistenceService {
  constructor(private logger: Logger) {}

  private async getConfig() {
    const c = vscode.workspace.getConfiguration("lokal-coder");
    let url = (c.get<string>("supabaseUrl", "") || "").trim();
    let key = (c.get<string>("supabaseServiceRoleKey", "") || "").trim();

    // 1. Try to load from .env FIRST
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        const envUri = vscode.Uri.joinPath(workspaceFolders[0].uri, ".env");
        const envContent = await vscode.workspace.fs.readFile(envUri);
        const text = Buffer.from(envContent).toString("utf8");

        const getEnvVar = (t: string, k: string) => {
          const r = new RegExp(`^\\s*${k}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s#]*))`, "m");
          const m = t.match(r);
          return m ? (m[1] || m[2] || m[3] || "").trim() : null;
        };

        const eUrl = getEnvVar(text, "SUPABASE_URL");
        const eKey = getEnvVar(text, "SUPABASE_SERVICE_ROLE_KEY");

        if (eUrl) {
          url = eUrl;
          this.logger.info(`🌐 URL override from .env: ${url}`);
        }
        if (eKey) {
          key = eKey;
          const keyPrefix = key.startsWith("sb_secret")
            ? "SERVICE_ROLE"
            : key.startsWith("sb_publishable")
              ? "ANON"
              : "UNKNOWN";
          this.logger.info(`🔐 Key override from .env. Type: ${keyPrefix}`);
        }
      }
    } catch {
      /* ignore */
    }

    // 2. Default fallback if still empty
    if (!url) url = "http://127.0.0.1:54321";

    const config = {
      enabled: c.get<boolean>("enableChatPersistence", true),
      url,
      key,
    };
    return config;
  }

  public async isConfigured(): Promise<boolean> {
    const { enabled, url, key } = await this.getConfig();
    return enabled && Boolean(url) && Boolean(key);
  }

  private async client(): Promise<SupabaseClient | null> {
    const { url, key, enabled } = await this.getConfig();
    if (!enabled || !url || !key) {
      return null;
    }
    return createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  public getWorkspaceKey(): string | null {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      return folders[0].uri.fsPath;
    }
    // Fallback to active editor's folder if any
    const active = vscode.window.activeTextEditor;
    if (active) {
      const folder = vscode.workspace.getWorkspaceFolder(active.document.uri);
      if (folder) return folder.uri.fsPath;
    }
    return null;
  }

  public async getOrCreateSession(workspaceKey: string, userId?: string): Promise<string | null> {
    if (!userId) {
      this.logger.error(
        "Chat persist: Attempted to getOrCreateSession without a userId. Blocking request."
      );
      return null;
    }

    const sb = await this.client();
    if (!sb) return null;

    const normalizedWk = workspaceKey.replace(/[\\/]$/, "").toLowerCase();
    this.logger.info(`🔍 getOrCreateSession: normalizedWk=${normalizedWk}, userId=${userId}`);

    // 1. Search for existing session for this user OR an orphaned anonymous session in this workspace
    const { data: rows, error: selErr } = await sb
      .from("chat_sessions")
      .select("id, user_id")
      .eq("workspace_key", normalizedWk)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order("updated_at", { ascending: false });

    if (selErr) {
      this.logger.error(`Chat persist: query session — ${selErr.message}`);
      return null;
    }

    if (rows?.length) {
      const existing = rows[0];
      // 2. ADOPTION: If it was anonymous, claim it for this user
      if (existing.user_id === null) {
        this.logger.info(
          `🔄 Session Adoption: Claiming legacy session ${existing.id} for user ${userId}`
        );
        await sb.from("chat_sessions").update({ user_id: userId }).eq("id", existing.id);
      }
      return existing.id as string;
    }

    // 3. CREATE: No existing/orphaned session found, create fresh
    const { data: ins, error: insErr } = await sb
      .from("chat_sessions")
      .insert({ workspace_key: normalizedWk, title: "Default", user_id: userId })
      .select("id")
      .single();

    if (insErr) {
      this.logger.error(`Chat persist: create — ${insErr.message}`);
      return null;
    }
    return ins.id as string;
  }

  public async createNewSession(workspaceKey: string, userId: string): Promise<string | null> {
    const sb = await this.client();
    if (!sb) return null;

    const normalizedWk = workspaceKey.replace(/[\\/]$/, "").toLowerCase();
    const { data: ins, error: insErr } = await sb
      .from("chat_sessions")
      .insert({ workspace_key: normalizedWk, title: "Default", user_id: userId })
      .select("id")
      .single();

    if (insErr) {
      this.logger.error(`Chat persist: create fresh — ${insErr.message}`);
      return null;
    }
    return ins.id as string;
  }

  public async listSessions(workspaceKey: string, userId?: string): Promise<any[]> {
    if (!userId) {
      this.logger.error(
        "Chat persist: Attempted to listSessions without a userId. Blocking request."
      );
      return [];
    }

    const sb = await this.client();
    if (!sb) {
      return [];
    }

    const { data, error } = await sb
      .from("chat_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      this.logger.error(
        `Chat persist: list sessions error — ${error.message} (code: ${error.code})`
      );
      return [];
    }

    this.logger.info(
      `Chat persist: list — Queried userId: ${userId}. Found ${data?.length || 0} sessions.`
    );
    return data || [];
  }

  public async deleteSession(sessionId: string): Promise<void> {
    const sb = await this.client();
    if (!sb) {
      return;
    }
    // Messages are deleted by DB cascade if fkeys are set, if not delete manually
    await sb.from("chat_messages").delete().eq("session_id", sessionId);
    await sb.from("chat_sessions").delete().eq("id", sessionId);
  }

  private async touchSession(sessionId: string): Promise<void> {
    const sb = await this.client();
    if (!sb) {
      return;
    }
    await sb
      .from("chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId);
  }

  public async loadMessages(sessionId: string): Promise<PersistedMessageRow[]> {
    const sb = await this.client();
    if (!sb) {
      return [];
    }
    const { data, error } = await sb
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (error) {
      this.logger.error(`Chat persist: load messages — ${error.message}`);
      return [];
    }
    return (data || []) as PersistedMessageRow[];
  }

  public async appendMessage(
    sessionId: string,
    role: "user" | "assistant" | "system",
    content: string,
    payload: Record<string, unknown>,
    clientMessageId?: string
  ): Promise<void> {
    const sb = await this.client();
    if (!sb) {
      return;
    }

    // Auto-title if "Default", null, or empty and it's a user message
    if (role === "user" && content.trim().length > 0) {
      const { data: session } = await sb
        .from("chat_sessions")
        .select("title")
        .eq("id", sessionId)
        .single();
      const currentTitle = (session?.title || "").trim();
      if (!currentTitle || currentTitle === "Default") {
        const newTitle =
          content.trim().slice(0, 60).replace(/\n/g, " ") +
          (content.trim().length > 60 ? "..." : "");
        if (newTitle) {
          await sb.from("chat_sessions").update({ title: newTitle }).eq("id", sessionId);
        }
      }
    }

    const { error } = await sb.from("chat_messages").insert({
      session_id: sessionId,
      role,
      content,
      payload,
      client_message_id: clientMessageId ?? null,
    });
    if (error) {
      this.logger.error(`Chat persist: append — ${error.message}`);
      return;
    }
    await this.touchSession(sessionId);
  }

  public async clearMessages(sessionId: string): Promise<void> {
    const sb = await this.client();
    if (!sb) {
      return;
    }
    const { error } = await sb.from("chat_messages").delete().eq("session_id", sessionId);
    if (error) {
      this.logger.error(`Chat persist: clear — ${error.message}`);
    }
    await this.touchSession(sessionId);
  }

  public async rowToWebviewMessage(row: PersistedMessageRow): Promise<Record<string, unknown>> {
    const p = (row.payload || {}) as Record<string, unknown>;
    return {
      id: row.client_message_id || row.id,
      role: row.role,
      content: row.content || "",
      thought: p.thought,
      traces: p.traces,
      activities: p.activities,
      stage: p.stage,
      errorSummary: p.errorSummary,
      mentions: p.mentions,
      planExecutable: p.planExecutable,
      diffId: p.diffId,
      checkpointId: p.checkpointId,
      planPath: p.planPath,
      filePath: p.filePath,
      isResolved: p.isResolved,
      isThinking: false,
    };
  }
}
