import { AnimatePresence, motion } from "framer-motion";
import { Activity, Bot, Clock, LogOut, Plus, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ActivityLine } from "./components/ActivityTimeline";
import { LoginPage } from "./components/auth/LoginPage";
import { Markdown } from "./components/common/Markdown";
import { HistoryModal } from "./components/HistoryModal";
import { InputDock } from "./components/InputDock";
import { MentionItem } from "./components/MentionMenu";
import { ThoughtProcess } from "./components/ThoughtProcess";
import { Trace } from "./components/TraceItem";
import { useVsCodeApi } from "./hooks/useVsCodeApi";

interface Message {
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

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "**Lokal Coder** is ready.\n\n- **Fast Plan** — quick implementation advice and structured code planning with full model choice.",
};

import { useSession } from "./contexts/SessionContext";

export default function App() {
  const { session, isLoading, signOut } = useSession();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentWorkspaceKey, setCurrentWorkspaceKey] = useState<string | null>(null);
  const [_assistantId, setAssistantId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const vscode = useVsCodeApi();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      console.warn("📬 Webview receiving:", message.type, message.payload);

      switch (message.type) {
        case "updateMessages":
          setMessages((prev: Message[]) => [...prev, message.payload]);
          break;

        case "chatHistory": {
          const { messages: list, sessionId, workspaceKey } = message.payload || {};
          if (Array.isArray(list)) {
            setMessages(list.length > 0 ? (list as Message[]) : [WELCOME_MESSAGE]);
          }
          if (sessionId) setCurrentSessionId(sessionId);
          if (workspaceKey) setCurrentWorkspaceKey(workspaceKey);
          break;
        }

        case "sessionsList": {
          const { sessions: list, currentWorkspaceKey: wk } = message.payload || {};
          console.warn("📜 sessionsList count:", list?.length, "wk:", wk);
          if (Array.isArray(list)) setSessions(list);
          if (wk) setCurrentWorkspaceKey(wk);
          break;
        }

        case "resetChat":
          setMessages([]);
          setAssistantId(undefined);
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
          setMessages((prev: Message[]) => {
            const last = prev[prev.length - 1];
            if (last && last.role === "assistant" && last.id === message.id) {
              // Optionally persist turn here or on the backend
            }
            return prev;
          });
          break;

        case "streamError":
          setMessages((prev: Message[]) => [
            ...prev,
            { id: message.id || Date.now(), role: "system", content: `Error: ${message.payload}` },
          ]);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [vscode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpenHistory = () => {
    vscode.postMessage({ command: "listSessions" });
    setIsHistoryOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[var(--bg-primary)]">
        <Activity size={24} className="text-sky-400 animate-spin mb-4" />
        <span className="text-[10px] uppercase tracking-widest text-[#555] font-black">
          Connecting...
        </span>
      </div>
    );
  }

  if (session === undefined) {
    // This case happens if Supabase is not configured
    return (
      <div className="flex flex-col items-center justify-center h-screen px-6 text-center bg-[var(--bg-primary)]">
        <Bot size={48} className="text-red-500/40 mb-6" />
        <h2 className="text-sm font-black uppercase tracking-widest text-white mb-2">
          Setup Required
        </h2>
        <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-[200px]">
          Please configure <code className="text-sky-400">SUPABASE_URL</code> and{" "}
          <code className="text-sky-400">SUPABASE_ANON_KEY</code> in your{" "}
          <code className="text-slate-300">.env</code> or extension settings.
        </p>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <div className="flex flex-col h-screen font-sans bg-[var(--bg-primary)] overflow-hidden">
      <header className="shrink-0 z-20 border-b border-[var(--chat-composer-border)] bg-[var(--chat-header-bg)] px-3 py-2 flex items-center justify-between">
        <div className="flex flex-col">
          <div className="text-[11px] font-bold uppercase tracking-widest text-sky-400">
            Lokal Coder
          </div>
          <div className="text-[9.5px] font-medium text-slate-500 uppercase tracking-tight">
            Studio · Open Source
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* New Chat */}
          <button
            onClick={() => vscode.postMessage({ command: "createSession" })}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] text-slate-500 hover:text-sky-400 transition-all group"
            title="New Chat"
          >
            <Plus size={16} />
          </button>

          {/* History Button */}
          <button
            onClick={handleOpenHistory}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] text-slate-500 hover:text-sky-400 transition-all group"
            title="Conversation History"
          >
            <Clock size={16} />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => vscode.postMessage({ command: "openSettings" })}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] text-slate-500 hover:text-sky-400 transition-all group"
            title="Lokal Coder Settings"
          >
            <Settings size={16} />
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-1" />

          {/* Logout Button */}
          <button
            onClick={signOut}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-all"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        currentWorkspaceKey={currentWorkspaceKey}
        currentUserId={session?.user?.id || null}
      />

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-[720px] mx-auto py-4 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`group relative transition-all ${
                    msg.role === "assistant"
                      ? "w-full py-1"
                      : msg.role === "user"
                        ? "p-3 rounded-2xl border max-w-[85%] bg-sky-500/10 border-sky-500/20"
                        : "p-3 rounded-2xl border w-full bg-red-500/5 border-red-500/10 text-[11px] font-mono"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <ThoughtProcess content={msg.thought || ""} isThinking={!!msg.isThinking} />
                  )}
                  <div className="text-[12.5px] leading-relaxed font-medium text-slate-200">
                    <Markdown content={msg.content} />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="shrink-0 py-2 border-t border-[var(--chat-composer-border)] bg-[var(--bg-primary)]">
        <InputDock />
      </footer>
    </div>
  );
}
