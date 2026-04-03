import { useVsCodeApi } from "@hooks/useVsCodeApi";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, MessageSquare, Search, Trash2, X } from "lucide-react";
import React, { useMemo, useState } from "react";

interface ChatSession {
  id: string;
  workspace_key: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  currentWorkspaceKey: string | null;
  currentUserId: string | null;
}

function formatRelativeTime(dateStr: string) {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 1) return "now";
    if (diffInMins < 60) return `${diffInMins} mins ago`;
    if (diffInHours < 24) return `${diffInHours} hrs ago`;
    if (diffInDays === 1) return "yesterday";
    return `${diffInDays} days ago`;
  } catch {
    return "unknown";
  }
}

export function HistoryModal({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  currentWorkspaceKey,
  currentUserId: _currentUserId,
}: HistoryModalProps) {
  const [search, setSearch] = useState("");
  const vscode = useVsCodeApi();

  const normalizePath = (p: string | null | undefined) => {
    if (!p) return "";
    try {
      return String(p)
        .replace(/[\\/]$/, "")
        .toLowerCase();
    } catch (_e) {
      return "";
    }
  };

  const filteredSessions = useMemo(() => {
    const list = Array.isArray(sessions) ? sessions : [];
    return list.filter((s) => {
      if (!s) return false;
      const title = String(s.title || "Untitled Chat").toLowerCase();
      const wk = String(s.workspace_key || "").toLowerCase();
      const term = (search || "").toLowerCase();
      return title.includes(term) || wk.includes(term);
    });
  }, [sessions, search]);

  const sections = useMemo(() => {
    const currentWk = normalizePath(currentWorkspaceKey);
    const activeId = currentSessionId;

    if (filteredSessions.length === 0) return [];

    const current = filteredSessions.find((s) => s.id === activeId);
    const recentInWorkspace = filteredSessions.filter((s) => {
      if (s.id === activeId) return false;
      const swk = normalizePath(s.workspace_key);
      return currentWk && swk === currentWk;
    });
    const other = filteredSessions.filter((s) => {
      if (s.id === activeId) return false;
      const swk = normalizePath(s.workspace_key);
      const isRecent = currentWk && swk === currentWk;
      return !isRecent;
    });

    return [
      { title: "Active Chat", items: current ? [current] : [] },
      {
        title: `History in ${currentWorkspaceKey?.split(/[\\/]/).pop() || "Workspace"}`,
        items: recentInWorkspace,
      },
      { title: "Global History", items: other },
    ].filter((s) => s.items.length > 0);
  }, [filteredSessions, currentSessionId, currentWorkspaceKey]);

  const handleSelect = (sessionId: string) => {
    vscode.postMessage({ command: "loadSession", payload: { sessionId } });
    onClose();
  };

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    vscode.postMessage({ command: "deleteSession", payload: { sessionId } });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-12 px-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative w-full max-w-[400px] bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[70vh]"
        >
          <div className="p-4 border-b border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#888]">
                History
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => vscode.postMessage({ command: "listSessions" })}
                  className="p-1 hover:bg-white/5 rounded-md text-[#666] hover:text-sky-400 transition-colors"
                  title="Refresh history"
                >
                  <Clock size={14} />
                </button>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-white/5 rounded-md text-[#666] hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="relative flex items-center group">
              <Search
                size={14}
                className="absolute left-3 text-[#555] group-focus-within:text-sky-400 transition-colors"
              />
              <input
                autoFocus
                placeholder="Search history..."
                className="w-full bg-white/[0.03] border border-white/5 rounded-lg py-2 pl-9 pr-4 text-[13px] text-white focus:outline-none focus:border-sky-500/50 focus:bg-white/[0.05] transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4">
            {sections.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center opacity-40">
                <Clock size={32} strokeWidth={1} className="mb-2" />
                <span className="text-[11px] font-medium tracking-wide">
                  {search ? "No results found" : "No history found"}
                </span>
              </div>
            ) : (
              sections.map((section) => (
                <div key={section.title} className="space-y-1">
                  <header className="px-3 py-1 text-[10px] font-bold text-[#555] uppercase tracking-wider flex items-center justify-between">
                    <span>{section.title}</span>
                    <span className="opacity-20">{section.items.length}</span>
                  </header>
                  <main className="space-y-0.5">
                    {section.items.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => handleSelect(session.id)}
                        className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all border ${
                          session.id === currentSessionId
                            ? "bg-sky-500/10 border-sky-500/20 text-sky-400"
                            : "hover:bg-white/[0.04] border-transparent text-[#ccc] hover:text-white"
                        }`}
                      >
                        <div
                          className={`p-1.5 rounded-md ${session.id === currentSessionId ? "bg-sky-500/20" : "bg-white/5"}`}
                        >
                          <MessageSquare size={14} />
                        </div>
                        <div className="flex-1 min-w-0 pr-12">
                          <div className="text-[12.5px] font-medium truncate">
                            {session.title || "Untitled Chat"}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-[10px] opacity-40 font-semibold group-hover:opacity-0 transition-opacity whitespace-nowrap">
                            {formatRelativeTime(session.updated_at)}
                          </span>
                          <button
                            onClick={(e) => handleDelete(e, session.id)}
                            className="absolute right-3 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 text-[#666] hover:text-red-500 rounded-md transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </main>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
