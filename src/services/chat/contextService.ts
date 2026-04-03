import * as vscode from "vscode";
import { Logger } from "@core/logger";

export interface ActiveContext {
  fileName?: string;
  languageId?: string;
  content?: string;
  selection?: string;
  diagnostics?: string;
  projectMap?: string;
}

function truncateMiddle(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  const head = Math.floor(maxChars * 0.55);
  const tail = maxChars - head - 80;
  return `${text.slice(0, head)}\n\n[… truncated ${text.length - maxChars} chars …]\n\n${text.slice(-tail)}`;
}

export class ContextService {
  constructor(private logger: Logger) {}

  /**
   * Scrapes the active editor for metadata, content, and errors.
   */
  public async getActiveContext(fileService: any): Promise<ActiveContext> {
    const editor = vscode.window.activeTextEditor;
    const projectMap = await fileService.getProjectMap();

    if (!editor) {
      this.logger.info("No active editor found for context gathering.");
      return { projectMap };
    }

    const document = editor.document;
    const selection = editor.selection;
    const selectionText = selection.isEmpty ? undefined : document.getText(selection);

    // Capture linter errors/warnings for the active file
    const diagnostics = vscode.languages.getDiagnostics(document.uri);
    const diagnosticsText =
      diagnostics.length > 0
        ? diagnostics
            .map(
              (d) =>
                `[${vscode.DiagnosticSeverity[d.severity]}] ${d.message} (Line ${d.range.start.line + 1})`
            )
            .join("\n")
        : undefined;

    return {
      fileName: document.fileName,
      languageId: document.languageId,
      content: document.getText(),
      selection: selectionText,
      diagnostics: diagnosticsText,
      projectMap,
    };
  }

  /**
   * Formats the gathered context into a structured string for the LLM prompt.
   */
  public formatContextPrompt(context: ActiveContext): string {
    const config = vscode.workspace.getConfiguration("lokal-coder");
    const maxMap = config.get<number>("contextMaxProjectMapChars", 12000);
    const maxFile = config.get<number>("contextMaxFileChars", 32000);

    let prompt = `[CONTEXT]\n`;

    if (context.projectMap) {
      let map = context.projectMap;
      if (map.length > maxMap) {
        map = `${map.slice(0, maxMap)}\n... [project map truncated]\n`;
      }
      prompt += `[PROJECT STRUCTURE]\n${map}\n\n`;
    }

    if (!context.fileName) {
      prompt += `No file is currently open. This is a blank workspace.\n`;
      prompt += `[END CONTEXT]\n`;
      return prompt;
    }

    prompt += `Active File: ${context.fileName}\n`;
    prompt += `Language: ${context.languageId}\n\n`;

    if (context.selection) {
      prompt += `[SELECTED CODE]\n${context.selection}\n\n`;
    }

    const full =
      context.content && context.content.length > maxFile
        ? truncateMiddle(context.content, maxFile)
        : context.content || "";
    prompt += `[FULL CONTENT]\n${full}\n\n`;

    if (context.diagnostics) {
      prompt += `[DIAGNOSTICS / ERRORS]\n${context.diagnostics}\n\n`;
    }

    prompt += `[END CONTEXT]\n`;
    return prompt;
  }

  /**
   * Editor/linter diagnostics for a workspace-relative file path (for agent verification loop).
   */
  public async getDiagnosticsForRelativePath(relativePath: string): Promise<string | undefined> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      return undefined;
    }
    const uri = vscode.Uri.joinPath(folder.uri, relativePath);
    const diagnostics = vscode.languages.getDiagnostics(uri);
    if (diagnostics.length === 0) {
      return undefined;
    }
    return diagnostics
      .map(
        (d) =>
          `[${vscode.DiagnosticSeverity[d.severity]}] ${d.message} (Line ${d.range.start.line + 1})`
      )
      .join("\n");
  }
}
