declare const acquireVsCodeApi: () => any;

let vscode: any;

export function useVsCodeApi() {
  if (!vscode) {
    try {
      vscode = acquireVsCodeApi();
    } catch {
      // Fallback for browser testing
      vscode = {
        postMessage: (msg: any) => console.warn("VS Code Message (Fallback):", msg),
        getState: () => ({}),
        setState: (s: any) => s,
      };
    }
  }
  return vscode;
}
