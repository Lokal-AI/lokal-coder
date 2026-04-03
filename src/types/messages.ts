export type WebviewCommand =
  | "onReady"
  | "listModels"
  | "sendMessage"
  | "clearHistory"
  | "switchMode"
  | "cancelRequest"
  | "showInformation"
  | "listWorkspaceItems"
  | "acceptDiff"
  | "rejectDiff"
  | "approvePlan"
  | "rejectPlan"
  | "openFile"
  | "persistAssistantTurn"
  | "setUser"
  | "listSessions"
  | "loadSession"
  | "deleteSession"
  | "createSession"
  | "openSettings"
  | "revealInExplorer";

export interface WebviewMessage {
  command: WebviewCommand;
  payload?: any;
}

export interface SendMessagePayload {
  text: string;
  mode: "ASK" | "PLAN" | "AGENT";
  model: string;
  mentions?: any[];
  /** Client-generated id for assistant turn + abort correlation */
  requestId: string;
}

export interface ExtensionMessage {
  type:
    | "updateMessages"
    | "setLoading"
    | "setError"
    | "setMode"
    | "thoughtChunk"
    | "diffReview"
    | "checkpoint"
    | "agentTrace"
    | "stage"
    | "streamChunk"
    | "streamEnd"
    | "streamError"
    | "agentUpdate"
    | "workspaceItems"
    | "listModelsUpdate"
    | "listModelsError"
    | "done"
    | "activityLine";
  payload: any;
  id?: string | number;
  planReady?: boolean;
}
