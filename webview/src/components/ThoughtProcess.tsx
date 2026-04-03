import { Markdown } from "@components/common/Markdown";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";
import React, { useState } from "react";

interface ThoughtProcessProps {
  content: string;
}

/** Collapsible chain-of-thought text only (no duplicate “Thinking…” — status lives in ActivityTimeline). */
export const ThoughtProcess: React.FC<ThoughtProcessProps> = ({ content }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!content?.trim()) return null;

  return (
    <div className="flex flex-col mb-3 select-none">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-fit rounded-lg px-2 py-1.5 -ml-1
          hover:bg-[var(--vscode-toolbar-hoverBackground,rgba(255,255,255,0.06))] transition-colors text-left"
      >
        <Sparkles
          size={12}
          className="shrink-0 opacity-50"
          style={{ color: "var(--chat-muted)" }}
        />
        <span
          className="text-[11px] font-medium flex items-center gap-1.5"
          style={{ color: "var(--chat-muted)" }}
        >
          <motion.span
            animate={{ rotate: isOpen ? 0 : -90 }}
            transition={{ duration: 0.2 }}
            className="inline-flex"
          >
            <ChevronDown size={12} strokeWidth={2} />
          </motion.span>
          Thought
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden mt-1 rounded-lg border border-[var(--chat-composer-border)] bg-[var(--vscode-textBlockQuote-background,rgba(0,0,0,0.2))] px-3 py-2"
          >
            <div
              className="text-[11px] leading-relaxed italic opacity-90 prose-compact"
              style={{ color: "var(--chat-muted)" }}
            >
              <Markdown content={content} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
