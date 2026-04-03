import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  FileText,
  Search,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react";
import React, { useState } from "react";

export interface Trace {
  agentName: string;
  avatar: string;
  thought: string;
  action: string;
  result: string;
}

interface TraceItemProps {
  trace: Trace;
}

export const TraceItem: React.FC<TraceItemProps> = ({ trace }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getActionIcon = (action: string) => {
    if (action.includes("run_test") || action.includes("run_command"))
      return <Terminal size={12} className="text-emerald-400" />;
    if (action.includes("read_file") || action.includes("write_file"))
      return <FileText size={12} className="text-blue-400" />;
    if (action.includes("architecture_map") || action.includes("batch_read"))
      return <Search size={12} className="text-amber-400" />;
    if (action.includes("security")) return <ShieldCheck size={12} className="text-red-400" />;
    if (action.includes("perf")) return <Zap size={12} className="text-yellow-400" />;
    return <Activity size={12} className="text-slate-400" />;
  };

  return (
    <div className="my-1.5 border border-[var(--chat-composer-border)] bg-[var(--vscode-textBlockQuote-background,rgba(255,255,255,0.03))] rounded-xl overflow-hidden transition-colors hover:border-[var(--vscode-focusBorder,rgba(255,255,255,0.12))]">
      {/* Summary Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-2.5 py-2 cursor-pointer select-none group"
      >
        <div className="flex items-center justify-center w-5 h-5 rounded-full border border-[var(--chat-composer-border)] bg-[var(--vscode-badge-background,rgba(255,255,255,0.06))] group-hover:opacity-90 transition-opacity">
          {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </div>

        <span
          className="text-[13px] flex items-center gap-1.5 font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          <span className="text-[15px]">{trace.avatar}</span>
          {trace.agentName}
        </span>

        <div className="flex items-center gap-1 ml-auto border-l border-[var(--chat-composer-border)] pl-2 opacity-70 group-hover:opacity-100 transition-opacity">
          {getActionIcon(trace.action)}
          <span
            className="text-[10px] font-mono uppercase tracking-tighter"
            style={{ color: "var(--chat-muted)" }}
          >
            {trace.action}
          </span>
        </div>
      </div>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-[var(--chat-composer-border)] bg-[rgba(0,0,0,0.15)]">
              {/* Thought Section */}
              <div className="pt-2">
                <h4
                  className="text-[9px] font-semibold uppercase tracking-wider mb-1"
                  style={{ color: "var(--chat-muted)" }}
                >
                  Reasoning
                </h4>
                <div
                  className="text-[10px] italic leading-relaxed pl-2 border-l border-[var(--chat-composer-border)]"
                  style={{ color: "var(--chat-muted)" }}
                >
                  {trace.thought}
                </div>
              </div>

              {/* Result Section */}
              <div>
                <h4
                  className="text-[9px] font-semibold uppercase tracking-wider mb-1"
                  style={{ color: "var(--chat-muted)" }}
                >
                  Observation
                </h4>
                <div
                  className="rounded-lg border border-[var(--chat-composer-border)] bg-[var(--vscode-editor-background,#1e1e1e)] p-2 font-mono text-[9px] overflow-x-auto custom-scrollbar whitespace-pre-wrap max-h-48"
                  style={{ color: "var(--text-primary)" }}
                >
                  {trace.result || "(No output returned)"}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
