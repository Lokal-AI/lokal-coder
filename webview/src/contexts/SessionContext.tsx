import { ActivityLine } from "@components/ActivityTimeline";
import { MentionItem } from "@components/MentionMenu";
import { Trace } from "@components/TraceItem";
import { useVsCodeApi } from "@hooks/useVsCodeApi";
import { supabase } from "@lib/supabase";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

export interface Message {
  id: string | number;
  role: "assistant" | "user" | "system";
  content: string;
  thought?: string;
  isThinking?: boolean;
  mentions?: MentionItem[];
  diffId?: string;
  checkpointId?: string;
  planPath?: string;
  filePath?: string;
  isResolved?: boolean;
  traces?: Trace[];
  stage?: string;
  activities?: ActivityLine[];
  planExecutable?: boolean;
  errorSummary?: string;
}

export const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "**Lokal Coder** is ready.\n\n- **Fast Plan** — quick implementation advice and structured code planning with full model choice.",
};

/** Merge stream/activity updates into the correct assistant row (not always last: e.g. after user bubble). */
function findLastAssistantIndex(messages: Message[], assistantId: string | number): number {
  const sid = String(assistantId);
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "assistant" && String(m.id) === sid) {
      return i;
    }
  }
  return -1;
}

interface SessionContextType {
  session: any | null;
  user: any | null;
  isLoading: boolean;
  signOut: () => Promise<void>;

  // Chat Session State
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  sessions: any[];
  currentSessionId: string | null;
  currentWorkspaceKey: string | null;
  loadSession: (sessionId: string) => void;
  createSession: () => void;

  // Error State
  globalError: { message: string; details?: string; code?: string } | null;
  setGlobalError: (error: { message: string; details?: string; code?: string } | null) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  // No Supabase: stay logged out without syncing state inside an effect (avoids sync setState in effects).
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(supabase));
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentWorkspaceKey, setCurrentWorkspaceKey] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<{
    message: string;
    details?: string;
    code?: string;
  } | null>(null);

  const vscode = useVsCodeApi();

  useEffect(() => {
    if (!supabase) {
      console.warn("⚠️ Supabase client is not initialized (check your .env/settings).");
      return;
    }

    // Initial session check with 2s strict timeout to prevent blank screen hangs
    let checkFinished = false;
    const timeout = setTimeout(() => {
      if (!checkFinished) {
        console.warn("⏳ Initial session check timed out. Defaulting to Login/Error.");
        setIsLoading(false);
      }
    }, 2000);

    supabase.auth
      .getSession()
      .then(({ data: { session: initial } }: { data: { session: any } }) => {
        checkFinished = true;
        console.warn("🔑 Initial session check:", initial?.user?.id || "No user");
        setSession(initial);
        if (initial?.user?.id) {
          vscode.postMessage({ command: "setUser", payload: { userId: initial.user.id } });
        }
      })
      .catch((err: any) => {
        checkFinished = true;
        console.error("❌ Initial session check failed:", err);
        setSession(null);
      })
      .finally(() => {
        clearTimeout(timeout);
        setIsLoading(false);
      });

    const authSubscription = supabase.auth.onAuthStateChange((event: string, nextSession: any) => {
      console.warn(`🔐 Auth state change [${event}]:`, nextSession?.user?.id || "No user");
      setSession(nextSession);
      vscode.postMessage({
        command: "setUser",
        payload: { userId: nextSession?.user?.id || null },
      });
      if (nextSession) setIsLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      authSubscription.data.subscription.unsubscribe();
    };
  }, [vscode]);

  useEffect(() => {
    // Notify extension we are ready to receive initial state
    vscode.postMessage({ command: "onReady" });
  }, [vscode]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      console.warn("📬 Webview Context receiving:", message.type, message.payload);

      switch (message.type) {
        case "updateMessages":
          setMessages((prev: Message[]) => [...prev, message.payload]);
          break;

        case "chatHistory": {
          const { messages: list, sessionId, workspaceKey } = message.payload || {};
          if (Array.isArray(list)) {
            setMessages(list.length > 0 ? (list as Message[]) : [WELCOME_MESSAGE]);
          }
          setCurrentSessionId(sessionId || null);
          if (workspaceKey) setCurrentWorkspaceKey(workspaceKey);
          break;
        }

        case "sessionsList": {
          const { sessions: list, currentWorkspaceKey: wk } = message.payload || {};
          if (Array.isArray(list)) setSessions(list);
          if (wk) setCurrentWorkspaceKey(wk);
          break;
        }

        case "resetChat":
          setMessages([WELCOME_MESSAGE]);
          setCurrentSessionId(null);
          break;

        case "thoughtChunk":
          setMessages((prev: Message[]) => {
            const idx = findLastAssistantIndex(prev, message.id);
            if (idx >= 0) {
              const row = prev[idx];
              return [
                ...prev.slice(0, idx),
                {
                  ...row,
                  thought: (row.thought || "") + message.payload,
                  isThinking: true,
                },
                ...prev.slice(idx + 1),
              ];
            }
            return [
              ...prev,
              {
                id: message.id,
                role: "assistant",
                content: "",
                thought: message.payload,
                isThinking: true,
              },
            ];
          });
          break;

        case "streamChunk":
          setMessages((prev: Message[]) => {
            const idx = findLastAssistantIndex(prev, message.id);
            const chunk = typeof message.payload === "string" ? message.payload : "";
            if (idx >= 0) {
              const row = prev[idx];
              return [
                ...prev.slice(0, idx),
                {
                  ...row,
                  content: (row.content || "") + chunk,
                  // Keep true until streamEnd so the timeline spinner shows during tools + reply.
                  isThinking: true,
                },
                ...prev.slice(idx + 1),
              ];
            }
            return [
              ...prev,
              {
                id: message.id,
                role: "assistant",
                content: chunk,
                isThinking: true,
              },
            ];
          });
          break;

        case "streamEnd":
          setMessages((prev: Message[]) => {
            const id = message.id as string | number | undefined;
            if (id === undefined) return prev;
            const idx = findLastAssistantIndex(prev, id);
            if (idx < 0) return prev;
            const row = prev[idx];
            return [...prev.slice(0, idx), { ...row, isThinking: false }, ...prev.slice(idx + 1)];
          });
          break;

        case "streamError":
          setMessages((prev: Message[]) => [
            ...prev,
            { id: message.id || Date.now(), role: "system", content: `Error: ${message.payload}` },
          ]);
          break;

        case "activityLine": {
          const assistantId = message.id as string | number;
          const raw = message.payload;
          const p =
            raw && typeof raw === "object" && !Array.isArray(raw)
              ? (raw as { verb?: unknown; detail?: unknown })
              : {};
          const verb = typeof p.verb === "string" ? p.verb : "Activity";
          const detail = typeof p.detail === "string" ? p.detail : undefined;
          const line = {
            verb,
            detail,
            id: `${String(assistantId)}-act-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          };
          setMessages((prev: Message[]) => {
            const idx = findLastAssistantIndex(prev, assistantId);
            if (idx >= 0) {
              const target = prev[idx];
              return [
                ...prev.slice(0, idx),
                {
                  ...target,
                  activities: [...(target.activities || []), line],
                },
                ...prev.slice(idx + 1),
              ];
            }
            return [
              ...prev,
              {
                id: assistantId,
                role: "assistant" as const,
                content: "",
                isThinking: true,
                activities: [line],
              },
            ];
          });
          break;
        }

        case "globalError":
          console.error("🚫 Global Error received:", message.payload);
          setGlobalError(message.payload);
          setIsLoading(false);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [vscode]);

  const signOut = async () => {
    await supabase?.auth.signOut();
    setSession(null);
    setMessages([WELCOME_MESSAGE]);
    setCurrentSessionId(null);
    // Notify extension immediately
    vscode.postMessage({ command: "setUser", payload: { userId: null } });
  };

  const loadSession = (sessionId: string) => {
    vscode.postMessage({ command: "loadSession", payload: { sessionId } });
  };

  const createSession = () => {
    vscode.postMessage({ command: "createSession" });
  };

  return (
    <SessionContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        signOut,
        messages,
        setMessages,
        sessions,
        currentSessionId,
        currentWorkspaceKey,
        loadSession,
        createSession,
        globalError,
        setGlobalError,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
