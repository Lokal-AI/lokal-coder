import { MessageRouter } from "@chat/messageRouter";
import { ServiceContainer } from "@core/container";
import { WebviewMessage } from "@lokal-types/messages";
import * as vscode from "vscode";

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

    const config = ServiceContainer.getInstance().resolve<any>("ConfigService");
    const supabaseUrl = config.getSupabaseUrl();
    const supabaseAnonKey = config.getSupabaseAnonKey();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<link rel="stylesheet" type="text/css" href="${styleUri}">
				<title>Lokal Coder Studio</title>
				<script>
					window.LOKAL_CONFIG = {
						supabaseUrl: "${supabaseUrl || ""}",
						supabaseAnonKey: "${supabaseAnonKey || ""}"
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
