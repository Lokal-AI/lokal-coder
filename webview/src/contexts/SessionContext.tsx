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
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any | null | undefined>(supabase ? null : undefined);
  const [isLoading, setIsLoading] = useState(!!supabase);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentWorkspaceKey, setCurrentWorkspaceKey] = useState<string | null>(null);

  const vscode = useVsCodeApi();

  useEffect(() => {
    if (!supabase) return;

    // Initial session check
    supabase?.auth
      .getSession()
      .then(({ data: { session } }: { data: { session: any } }) => {
        console.warn("🔑 Initial session check:", session?.user?.id || "No user");
        setSession(session);
        if (session?.user?.id) {
          vscode.postMessage({ command: "setUser", payload: { userId: session.user.id } });
        }
        setIsLoading(false);
      })
      .catch((err: any) => {
        console.error("❌ Initial session check failed:", err);
        setIsLoading(false);
      });

    // Listen for auth changes
    const authSubscription = supabase?.auth.onAuthStateChange((event: string, session: any) => {
      console.warn(`🔐 Auth state change [${event}]:`, session?.user?.id || "No user");
      setSession(session);
      // Always sync with extension, even if session is null (logout)
      vscode.postMessage({ command: "setUser", payload: { userId: session?.user?.id || null } });
      setIsLoading(false);
    });

    return () => authSubscription?.data.subscription.unsubscribe();
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
            const last = prev[prev.length - 1];
            if (last && last.role === "assistant" && last.id === message.id) {
              return [
                ...prev.slice(0, -1),
                { ...last, thought: (last.thought || "") + message.payload, isThinking: true },
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
            const last = prev[prev.length - 1];
            if (last && last.role === "assistant" && last.id === message.id) {
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + message.payload, isThinking: false },
              ];
            }
            return [
              ...prev,
              { id: message.id, role: "assistant", content: message.payload, isThinking: false },
            ];
          });
          break;

        case "streamEnd":
          // Handle logic if needed
          break;

        case "streamError":
          setMessages((prev: Message[]) => [
            ...prev,
            { id: message.id || Date.now(), role: "system", content: `Error: ${message.payload}` },
          ]);
          break;

        case "activityLine":
          setMessages((prev: Message[]) => {
            const last = prev[prev.length - 1];
            if (last && last.id === message.id) {
              const activities = [
                ...(last.activities || []),
                { ...message.payload, id: Math.random().toString() },
              ];
              return [...prev.slice(0, -1), { ...last, activities }];
            }
            return prev;
          });
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
