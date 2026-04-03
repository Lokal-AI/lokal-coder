import { Logger } from "@core/logger";
import * as vscode from "vscode";

export class ConfigService {
  private _url: string = "";
  private _anonKey: string = "";
  private _serviceKey: string = "";
  private _databaseUrl: string = "";
  private _ollamaBase: string = "";
  private _ollamaKey: string = "";
  private _layer0Model: string = "llama3.1:8b-instruct-q4_K_M";
  private _layer1Model: string = "llama3.1:8b-instruct-q4_K_M";
  private _executionModel: string = "llama3.1:8b-instruct-q4_K_M";
  private _embeddingModel: string = "nomic-embed-text:latest";

  private _isReady: Promise<void>;

  constructor(private logger: Logger) {
    // Initial load from configuration (Synchronous)
    const config = vscode.workspace.getConfiguration("lokal-coder");
    this._url = (config.get<string>("supabaseUrl", "") || "").trim();
    this._anonKey = (config.get<string>("supabaseAnonKey", "") || "").trim();
    this._serviceKey = (config.get<string>("supabaseServiceRoleKey", "") || "").trim();
    this._databaseUrl = (config.get<string>("databaseUrl", "") || "").trim();
    this._ollamaBase = (config.get<string>("apiBaseUrl", "") || "").trim();
    this._ollamaKey = (config.get<string>("apiKey", "") || "").trim();

    // Async refresh to overlay with .env
    this._isReady = this.refresh();
  }

  public async waitForReady(): Promise<void> {
    return this._isReady;
  }

  public async refresh(): Promise<void> {
    const config = vscode.workspace.getConfiguration("lokal-coder");
    this._ollamaKey = (config.get<string>("apiKey", "") || "").trim();
    this._databaseUrl = (config.get<string>("databaseUrl", "") || "").trim();

    // Phase 2: Overlay with .env (Priority)
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        // Look for .env in both root and src/ subdirectory
        const rootEnvUri = vscode.Uri.joinPath(workspaceFolders[0].uri, ".env");
        const srcEnvUri = vscode.Uri.joinPath(workspaceFolders[0].uri, "src", ".env");

        let envText = "";

        for (const uri of [rootEnvUri, srcEnvUri]) {
          try {
            const content = await vscode.workspace.fs.readFile(uri);
            envText += "\n" + Buffer.from(content).toString("utf8");
          } catch {
            // Skip if file doesn't exist
          }
        }

        const getEnvVar = (t: string, k: string) => {
          const r = new RegExp(`^\\s*${k}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\r\\n\\s#]*))`, "m");
          const m = t.match(r);
          return m ? (m[1] || m[2] || m[3] || "").trim() : null;
        };

        const eUrl = getEnvVar(envText, "SUPABASE_URL");
        const eAnon = getEnvVar(envText, "SUPABASE_ANON_KEY") || getEnvVar(envText, "ANON_KEY");
        const eService =
          getEnvVar(envText, "SUPABASE_SERVICE_ROLE_KEY") || getEnvVar(envText, "SERVICE_ROLE_KEY");
        const eDatabaseUrl = getEnvVar(envText, "DATABASE_URL");
        const eOllamaBase =
          getEnvVar(envText, "LOKAL_AGENT_API_URL") ||
          getEnvVar(envText, "OLLAMA_API_BASE_URL") ||
          getEnvVar(envText, "API_BASE_URL");
        const eOllamaKey =
          getEnvVar(envText, "LOKAL_AGENT_API_KEY") ||
          getEnvVar(envText, "OLLAMA_API_KEY") ||
          getEnvVar(envText, "API_KEY");

        const eLayer0 = getEnvVar(envText, "LOKAL_AGENT_LAYER0_MODEL");
        const eLayer1 = getEnvVar(envText, "LOKAL_AGENT_LAYER1_MODEL");
        const eExec = getEnvVar(envText, "LOKAL_AGENT_EXECUTION_MODEL");
        const eEmbed = getEnvVar(envText, "LOKAL_AGENT_EMBEDDING_MODEL");

        if (eUrl) this._url = eUrl;
        if (eAnon) this._anonKey = eAnon;
        if (eService) this._serviceKey = eService;
        if (eDatabaseUrl) this._databaseUrl = eDatabaseUrl;
        if (eOllamaBase) this._ollamaBase = eOllamaBase;
        if (eOllamaKey) this._ollamaKey = eOllamaKey;

        if (eLayer0) this._layer0Model = eLayer0;
        if (eLayer1) this._layer1Model = eLayer1;
        if (eExec) this._executionModel = eExec;
        if (eEmbed) this._embeddingModel = eEmbed;

        this.logger.info(`✅ Configuration successfully loaded from .env files`);
      }
    } catch (e: any) {
      this.logger.warn(`⚠️ Error reading .env: ${e.message}`);
    }

    // Phase 3: Apply normalization
    if (this._url && (this._url.includes("127.0.0.1") || this._url.includes("localhost"))) {
      if (!this._url.startsWith("http")) this._url = `http://${this._url}`;
    }

    this.logger.info(
      `⚙️ Config status: Supabase URL=${this._url ? "SET" : "MISSING"}, DATABASE_URL=${this._databaseUrl ? "SET" : "MISSING"}, Layer0=${this._layer0Model}`
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

  public getDatabaseUrl(): string {
    return this._databaseUrl;
  }

  public getOllamaBaseUrl(): string {
    return this._ollamaBase;
  }

  public getOllamaApiKey(): string {
    return this._ollamaKey;
  }

  public getLayer0Model(): string {
    return this._layer0Model;
  }

  public getLayer1Model(): string {
    return this._layer1Model;
  }

  public getExecutionModel(): string {
    return this._executionModel;
  }

  public getEmbeddingModel(): string {
    return this._embeddingModel;
  }

  public isConfigured(): boolean {
    return Boolean(this._url) && (Boolean(this._serviceKey) || Boolean(this._anonKey));
  }
}
