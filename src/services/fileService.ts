import * as vscode from "vscode";
import { ServiceContainer } from "../core/container";
import { Logger } from "../core/logger";

type ItemType = "file" | "folder" | "all";

export class FileService {
  private logger: Logger;

  constructor() {
    this.logger = ServiceContainer.getInstance().resolve<Logger>("Logger");
  }

  private staticExclusions: Set<string> = new Set();
  private dynamicIgnores: Set<string> = new Set();
  private hasLoadedIgnores: boolean = false;

  /**
   * Opens a native VS Code Diff view comparing the current file with new content.
   */
  public async openDiff(filePath: string, newContent: string): Promise<void> {
    try {
      const originalUri = this.getUriFromPath(filePath);

      // Create a temporary URI for the new content
      const tempFileName = `.lokal-tmp-${Date.now()}-${filePath.split("/").pop()}`;
      const tempUri = this.getUriFromPath(tempFileName);

      const data = new TextEncoder().encode(newContent);
      await vscode.workspace.fs.writeFile(tempUri, data);

      // Open the diff
      await vscode.commands.executeCommand(
        "vscode.diff",
        originalUri,
        tempUri,
        `${filePath} (Proposed Changes)`
      );

      // Note: We don't delete the temp file immediately so the diff view stays open.
      // The extension should clean these up on deactivation or after apply.
    } catch (err: any) {
      this.logger.error(`❌ Failed to open diff: ${err.message}`);
      throw err;
    }
  }

  private async ensureIgnoresLoaded(): Promise<void> {
    if (this.hasLoadedIgnores) return;

    // 1. Load Side Guard (Default Exclusions from Config)
    const config = vscode.workspace.getConfiguration("lokal-coder");
    const defaults = config.get<string[]>("defaultExclusions") || [];
    this.staticExclusions = new Set(defaults);

    // 2. Load Project Overrides (.lokal-ignore)
    await this.loadIgnoreFile();

    this.hasLoadedIgnores = true;
  }

  private async loadIgnoreFile(): Promise<void> {
    try {
      const folders = this.getWorkspaceFolders();
      if (folders.length === 0) return;

      const ignoreUri = vscode.Uri.joinPath(folders[0].uri, ".lokal-ignore");
      try {
        const data = await vscode.workspace.fs.readFile(ignoreUri);
        const content = new TextDecoder().decode(data);
        const lines = content
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith("#") && !/^\s{2,}/.test(l));

        this.dynamicIgnores = new Set(lines);
        this.logger.info(`Loaded ${this.dynamicIgnores.size} patterns from .lokal-ignore`);
      } catch {
        // File doesn't exist, ignore
      }
    } catch (err: any) {
      this.logger.error(`Failed to load .lokal-ignore: ${err.message}`);
    }
  }

  // -----------------------------
  // ✅ Helpers
  // -----------------------------

  private getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return [];
    }
    return folders;
  }

  private getUriFromPath(filePath: string): vscode.Uri {
    const folders = this.getWorkspaceFolders();
    if (folders.length === 0) throw new Error("No workspace folder open.");

    // Always resolve from first workspace (safe default)
    return vscode.Uri.joinPath(folders[0].uri, filePath);
  }

  private shouldIgnore(relPath: string): boolean {
    const parts = relPath.split("/");

    // 1. Check Side Guard (Static/Default)
    if (parts.some((part) => this.staticExclusions.has(part))) return true;

    // 2. Check Project Overrides (Dynamic)
    for (const pattern of this.dynamicIgnores) {
      if (relPath === pattern || relPath.startsWith(pattern + "/")) return true;
      // Simple suffix glob (*.log)
      if (pattern.startsWith("*.") && relPath.endsWith(pattern.substring(1))) return true;
    }

    return false;
  }

  // -----------------------------
  // ✅ Read File
  // -----------------------------

  public async readFile(filePath: string): Promise<string> {
    try {
      const uri = this.getUriFromPath(filePath);
      const data = await vscode.workspace.fs.readFile(uri);
      return new TextDecoder().decode(data);
    } catch (err: any) {
      this.logger.error(`❌ Failed to read file: ${filePath} → ${err.message}`);
      throw err;
    }
  }

  // -----------------------------
  // ✅ Write File (auto-create dirs)
  // -----------------------------

  public async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const uri = this.getUriFromPath(filePath);

      // Ensure directory exists
      const dirPath = filePath.includes("/")
        ? filePath.substring(0, filePath.lastIndexOf("/"))
        : "";
      if (dirPath) {
        const dirUri = this.getUriFromPath(dirPath);
        await vscode.workspace.fs.createDirectory(dirUri);
      }

      const data = new TextEncoder().encode(content);
      await vscode.workspace.fs.writeFile(uri, data);

      this.logger.info(`✅ File written: ${filePath}`);
    } catch (err: any) {
      this.logger.error(`❌ Failed to write file: ${filePath} → ${err.message}`);
      throw err;
    }
  }

  // -----------------------------
  // ✅ Get Workspace Items (DUAL-ENGINE)
  // -----------------------------

  public async getWorkspaceItems(type: ItemType): Promise<any[]> {
    await this.ensureIgnoresLoaded();
    const folders = this.getWorkspaceFolders();
    if (folders.length === 0) return [];

    const config = vscode.workspace.getConfiguration("lokal-coder");
    const codingExts = config.get<string[]>("codingExtensions") || [];
    const defaults = config.get<string[]>("defaultExclusions") || [];

    const itemsMap = new Map<string, any>();
    const allIgnores = [...defaults, ...Array.from(this.dynamicIgnores)];
    const excludePattern = `**/{${allIgnores.join(",")}}/**`;

    try {
      // Phase 1: Rapid Root Scan
      for (const folder of folders) {
        const entries = await vscode.workspace.fs.readDirectory(folder.uri);
        for (const [name, fType] of entries) {
          if (this.shouldIgnore(name)) continue;

          const isDir = !!(fType & vscode.FileType.Directory);
          const isFile = !!(fType & vscode.FileType.File);

          if (isDir && (type === "folder" || type === "all")) {
            itemsMap.set(name, { id: name, name, type: "folder", relativePath: name });
          }

          if (isFile && (type === "file" || type === "all")) {
            const isEnv = name.startsWith(".env");
            const isCoding = this.isCodingFile(name, codingExts);

            if (isCoding || isEnv) {
              itemsMap.set(name, {
                id: name,
                name,
                type: "file",
                relativePath: name,
                isDefaultHidden: isEnv,
              });
            }
          }
        }
      }

      // Phase 2: Indexed Search
      if (type === "file" || type === "all") {
        const uris = await vscode.workspace.findFiles("**/*", excludePattern, 1000);
        for (const uri of uris) {
          const relPath = vscode.workspace.asRelativePath(uri, false);
          if (this.shouldIgnore(relPath)) continue;

          const name = relPath.split("/").pop() || relPath;
          const isEnv = name.startsWith(".env");
          const isCoding = this.isCodingFile(name, codingExts);

          if ((isCoding || isEnv) && !itemsMap.has(relPath)) {
            itemsMap.set(relPath, {
              id: relPath,
              name,
              type: "file",
              relativePath: relPath,
              isDefaultHidden: isEnv,
            });
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`❌ Workspace scan failed: ${err.message}`);
    }

    return Array.from(itemsMap.values());
  }

  private isCodingFile(fileName: string, extensions: string[]): boolean {
    const lower = fileName.toLowerCase();
    return extensions.some((ext) => lower.endsWith(ext.toLowerCase()));
  }

  /**
   * Scaffolds multiple files in a single operation.
   */
  public async scaffoldProject(files: { path: string; content: string }[]): Promise<void> {
    this.logger.info(`🏗️ Scaffolding ${files.length} files...`);

    for (const file of files) {
      try {
        await this.writeFile(file.path, file.content);
        this.logger.info(`✅ Scaffolded: ${file.path}`);
      } catch (err: any) {
        this.logger.error(`❌ Failed to scaffold ${file.path}: ${err.message}`);
        // Continue with other files even if one fails
      }
    }

    this.logger.info("✨ Scaffolding complete.");
  }

  // -----------------------------
  // ✅ Project Mapping (User Story 4.2)
  // -----------------------------

  /**
   * Generates a textual tree representation of the workspace structure.
   */
  // -----------------------------
  // ✅ Phase 5: Advanced Agentic Tools
  // -----------------------------

  /**
   * Generates a textual tree representation of the workspace structure.
   */
  public async getProjectMap(maxDepth: number = 2): Promise<string> {
    await this.ensureIgnoresLoaded();
    const folders = this.getWorkspaceFolders();
    if (folders.length === 0) return "No workspace detected.";

    let map = "";
    for (const folder of folders) {
      map += `Folder: ${folder.name}/\n`;
      map += await this.buildTree(folder.uri, "", 0, maxDepth);
    }
    return map;
  }

  private async buildTree(
    uri: vscode.Uri,
    indent: string,
    currentDepth: number,
    maxDepth: number
  ): Promise<string> {
    if (currentDepth >= maxDepth) return "";

    try {
      const entries = await vscode.workspace.fs.readDirectory(uri);
      let result = "";

      // Sort entries: folders first, then alphabetical
      entries.sort((a, b) => {
        const aIsDir = a[1] & vscode.FileType.Directory;
        const bIsDir = b[1] & vscode.FileType.Directory;
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a[0].localeCompare(b[0]);
      });

      for (const [name, type] of entries) {
        const relPath = indent.replace(/ {2}/g, "") + name;
        // Project Map should NOT show .env files by default
        if (name.startsWith(".env") || this.shouldIgnore(name) || this.shouldIgnore(relPath))
          continue;

        const isDir = !!(type & vscode.FileType.Directory);
        result += `${indent}${isDir ? "📁" : "📄"} ${name}\n`;

        if (isDir) {
          result += await this.buildTree(
            vscode.Uri.joinPath(uri, name),
            indent + "  ",
            currentDepth + 1,
            maxDepth
          );
        }
      }
      return result;
    } catch (err: any) {
      return `${indent}⚠️ Error reading directory: ${err.message}\n`;
    }
  }
}
