import { LoginPage } from "@components/auth/LoginPage";
import { Markdown } from "@components/common/Markdown";
import { ActivityTimeline } from "@components/ActivityTimeline";
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
    globalError,
    setGlobalError,
  } = useSession();

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const vscode = useVsCodeApi();

  useEffect(() => {
    console.warn("🎨 App component mounted successfully.");
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpenHistory = () => {
    vscode.postMessage({ command: "listSessions" });
    setIsHistoryOpen(true);
  };

  const handleRetry = () => {
    setGlobalError(null);
    vscode.postMessage({ command: "onReady" });
  };

  if (globalError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-8 text-center bg-[#0a0a0a]">
        <div className="relative mb-8">
          <div className="absolute inset-0 blur-3xl bg-red-500/10 rounded-full animate-pulse" />
          <div className="relative p-4 rounded-2xl bg-red-500/5 border border-red-500/20">
            <Activity size={42} className="text-red-500/80" />
          </div>
        </div>

        <h2 className="text-base font-black uppercase tracking-[0.2em] text-white mb-3">
          Application Error
        </h2>

        <div className="max-w-[280px] space-y-4">
          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
            {globalError.message}
          </p>

          {globalError.details && (
            <div className="p-3 rounded-lg bg-black/40 border border-white/5 text-left">
              <span className="block text-[9px] uppercase tracking-widest text-[#444] font-black mb-1">
                Technical Details
              </span>
              <p className="text-[10px] font-mono text-red-400/80 break-words leading-normal">
                {globalError.details}
              </p>
            </div>
          )}

          <div className="pt-4 flex flex-col gap-2">
            <button
              onClick={handleRetry}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-sky-400 transition-colors"
            >
              <Activity size={14} />
              Retry Connection
            </button>

            <button
              onClick={() => vscode.postMessage({ command: "openSettings" })}
              className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-wider transition-colors py-2"
            >
              Open Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#020202]">
        <div className="relative mb-6">
          <div className="absolute inset-0 blur-2xl bg-sky-500/20 rounded-full animate-pulse" />
          <Activity size={32} className="text-sky-400 animate-spin relative" />
        </div>
        <span className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-black animate-pulse">
          Initializing Hub
        </span>
      </div>
    );
  }

  // If session is undefined after loading, it means initialization failed or is strictly null
  if (session === undefined || session === null) {
    return <LoginPage />;
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
            {messages.map((msg, index) => (
              <motion.div
                key={`${msg.role}-${String(msg.id)}-${index}`}
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
                    <div className="space-y-2">
                      <ThoughtProcess content={msg.thought || ""} />
                      <ActivityTimeline items={msg.activities || []} streaming={!!msg.isThinking} />
                    </div>
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
