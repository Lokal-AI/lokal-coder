import * as vscode from "vscode";
import { ServiceContainer } from "../core/container";
import { MessageRouter } from "./messageRouter";
import { WebviewMessage } from "../types/messages";

export class ChatWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "lokal-coder-sidebar";
  private static _instance?: ChatWebviewProvider;
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {
    ChatWebviewProvider._instance = this;
  }

  public static postToWebview(message: unknown): void {
    ChatWebviewProvider._instance?._view?.webview.postMessage(message);
  }

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.onDidDispose(() => {
      if (this._view === webviewView) {
        this._view = undefined;
      }
    });

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data: WebviewMessage) => {
      const router = ServiceContainer.getInstance().resolve<MessageRouter>("MessageRouter");
      await router.handle(data, webviewView.webview);
    });
  }

  private async _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist-webview", "assets", "index.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist-webview", "assets", "index.css")
    );

    const config = vscode.workspace.getConfiguration("lokal-coder");
    let supabaseUrl = config.get<string>("supabaseUrl", "");
    let supabaseAnonKey = config.get<string>("supabaseAnonKey", "");

    const defaultUrl = "http://127.0.0.1:54321";

    // Fallback to .env if config is empty OR if url is the default (allowing override)
    if (!supabaseUrl || supabaseUrl === defaultUrl || !supabaseAnonKey) {
      try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
          const envUri = vscode.Uri.joinPath(workspaceFolders[0].uri, ".env");
          const envContent = await vscode.workspace.fs.readFile(envUri);
          const envText = Buffer.from(envContent).toString("utf8");

          // Robust parsing function
          const getEnvVar = (text: string, key: string) => {
            const regex = new RegExp(`^\\s*${key}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s#]*))`, "m");
            const match = text.match(regex);
            return match ? (match[1] || match[2] || match[3] || "").trim() : null;
          };

          const eUrl = getEnvVar(envText, "SUPABASE_URL");
          const eKey = getEnvVar(envText, "SUPABASE_ANON_KEY");

          if (eUrl && !supabaseUrl) supabaseUrl = eUrl;
          if (eKey && !supabaseAnonKey) supabaseAnonKey = eKey;
        }
      } catch (e: any) {
        console.warn(`Lokal Coder: Failed to read .env file fallback: ${e.message}`);
      }
    }

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<link rel="stylesheet" type="text/css" href="${styleUri}">
				<title>Lokal Coder Studio</title>
				<script>
					window.LOKAL_CONFIG = {
						supabaseUrl: "${supabaseUrl}",
						supabaseAnonKey: "${supabaseAnonKey}"
					};
				</script>
			</head>
			<body>
				<div id="root"></div>
				<script type="module" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}
