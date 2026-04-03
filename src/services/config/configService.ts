import * as vscode from "vscode";
import { Logger } from "@core/logger";

export class ConfigService {
  private _url: string = "";
  private _anonKey: string = "";
  private _serviceKey: string = "";
  private _ollamaBase: string = "";
  private _ollamaKey: string = "";

  private _isReady: Promise<void>;

  constructor(private logger: Logger) {
    this._isReady = this.refresh();
  }

  public async waitForReady(): Promise<void> {
    return this._isReady;
  }

  public async refresh(): Promise<void> {
    const config = vscode.workspace.getConfiguration("lokal-coder");

    // Phase 1: Load from VS Code Configuration
    this._url = (config.get<string>("supabaseUrl", "") || "").trim();
    this._anonKey = (config.get<string>("supabaseAnonKey", "") || "").trim();
    this._serviceKey = (config.get<string>("supabaseServiceRoleKey", "") || "").trim();
    this._ollamaBase = (config.get<string>("apiBaseUrl", "") || "").trim();
    this._ollamaKey = (config.get<string>("apiKey", "") || "").trim();

    // Phase 2: Overlay with .env (Priority)
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        // Look for .env specifically in src/ subdirectory as requested
        const envUri = vscode.Uri.joinPath(workspaceFolders[0].uri, "src", ".env");
        const envContent = await vscode.workspace.fs.readFile(envUri);
        const text = Buffer.from(envContent).toString("utf8");

        const getEnvVar = (t: string, k: string) => {
          // Robust regex for VAR=VALUE, supporting optional quotes and trimming
          const r = new RegExp(`^\\s*${k}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\r\\n\\s#]*))`, "m");
          const m = t.match(r);
          return m ? (m[1] || m[2] || m[3] || "").trim() : null;
        };

        const eUrl = getEnvVar(text, "SUPABASE_URL");
        const eAnon = getEnvVar(text, "SUPABASE_ANON_KEY") || getEnvVar(text, "ANON_KEY");
        const eService =
          getEnvVar(text, "SUPABASE_SERVICE_ROLE_KEY") || getEnvVar(text, "SERVICE_ROLE_KEY");
        const eOllamaBase =
          getEnvVar(text, "OLLAMA_API_BASE_URL") || getEnvVar(text, "API_BASE_URL");
        const eOllamaKey = getEnvVar(text, "OLLAMA_API_KEY") || getEnvVar(text, "API_KEY");

        if (eUrl) {
          this._url = eUrl;
          this.logger.info(`✅ Loaded SUPABASE_URL from .env: ${eUrl}`);
        }
        if (eAnon) {
          this._anonKey = eAnon;
          this.logger.info(`✅ Loaded SUPABASE_ANON_KEY from .env (Length: ${eAnon.length})`);
        }
        if (eService) {
          this._serviceKey = eService;
        }
        if (eOllamaBase) this._ollamaBase = eOllamaBase;
        if (eOllamaKey) this._ollamaKey = eOllamaKey;

        this.logger.info(`✅ Configuration successfully loaded from src/.env`);
      }
    } catch (e: any) {
      if (e instanceof vscode.FileSystemError && e.code === "FileNotFound") {
        this.logger.info("ℹ️ src/.env not found, using extension settings only.");
      } else {
        this.logger.warn(`⚠️ Error reading src/.env: ${e.message}`);
      }
    }

    // Phase 3: Apply normalization only (No Defaults)
    if (this._url && (this._url.includes("127.0.0.1") || this._url.includes("localhost"))) {
      if (!this._url.startsWith("http")) this._url = `http://${this._url}`;
    }

    this.logger.info(
      `⚙️ Config status: Supabase URL=${this._url ? "SET" : "MISSING"}, Anon Key=${this._anonKey ? "SET" : "MISSING"}`
    );
  }

  public getSupabaseUrl(): string {
    return this._url;
  }

  public getSupabaseAnonKey(): string {
    return this._anonKey;
  }

  public getSupabaseServiceRoleKey(): string {
    return this._serviceKey;
  }

  public getOllamaBaseUrl(): string {
    return this._ollamaBase;
  }

  public getOllamaApiKey(): string {
    return this._ollamaKey;
  }

  public isConfigured(): boolean {
    return Boolean(this._url) && (Boolean(this._serviceKey) || Boolean(this._anonKey));
  }
}
