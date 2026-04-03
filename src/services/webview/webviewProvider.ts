import { Logger } from "@core/logger";
import { MessageRouter } from "@chat/messageRouter";
import { ServiceContainer } from "@core/container";
import { WebviewMessage } from "@lokal-types/messages";
import * as vscode from "vscode";

export class ChatWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "lokal-coder-sidebar";
  private static _instance?: ChatWebviewProvider;
  private _view?: vscode.WebviewView;
  private logger: Logger;

  constructor(private readonly _extensionUri: vscode.Uri) {
    this.logger = ServiceContainer.getInstance().resolve<Logger>("Logger");
    ChatWebviewProvider._instance = this;
  }

  public static postToWebview(message: unknown): void {
    ChatWebviewProvider._instance?._view?.webview.postMessage(message);
  }

  public static async refresh(): Promise<void> {
    await ChatWebviewProvider._instance?.refresh();
  }

  public async refresh(): Promise<void> {
    if (this._view) {
      this.logger.info("Refreshing webview UI...");
      this._view.webview.html = await this._getHtmlForWebview(this._view.webview);
    }
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
      localResourceRoots: [
        this._extensionUri,
        vscode.Uri.joinPath(this._extensionUri, "dist-webview"),
      ],
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
    await config.waitForReady();
    const supabaseUrl = config.getSupabaseUrl();
    const supabaseAnonKey = config.getSupabaseAnonKey();

    // CSP: Allow scripts from local resource roots, styles, and connections.
    // connect-src MUST allow http and localhost/127.0.0.1 for local Supabase.
    // We also use webview.asWebviewUri for the base tag.
    const baseUri = webview.asWebviewUri(this._extensionUri);

    const csp = [
      `default-src 'none';`,
      `script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval';`,
      `style-src ${webview.cspSource} 'unsafe-inline' https:;`,
      `font-src ${webview.cspSource} https:;`,
      `img-src ${webview.cspSource} https: data:;`,
      `connect-src ${webview.cspSource} http: https: wss: ws: localhost:* 127.0.0.1:*;`,
    ].join(" ");

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<meta http-equiv="Content-Security-Policy" content="${csp}">
				<base href="${baseUri}/">
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
