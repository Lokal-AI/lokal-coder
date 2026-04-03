import { LoginPage } from "@components/auth/LoginPage";
import { Markdown } from "@components/common/Markdown";
import { HistoryModal } from "@components/HistoryModal";
import { InputDock } from "@components/InputDock";
import { ThoughtProcess } from "@components/ThoughtProcess";
import { useSession } from "@contexts/SessionContext";
import { useVsCodeApi } from "@hooks/useVsCodeApi";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Bot, Clock, LogOut, Plus, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function App() {
  const {
    session,
    isLoading,
    signOut,
    messages,
    sessions,
    currentSessionId,
    currentWorkspaceKey,
    createSession,
  } = useSession();

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const vscode = useVsCodeApi();

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
            onClick={createSession}
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
