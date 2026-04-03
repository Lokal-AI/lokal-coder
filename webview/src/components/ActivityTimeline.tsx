import {
  Brain,
  ChevronDown,
  Compass,
  FileText,
  Map,
  Microscope,
  Pencil,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { useState } from "react";

export interface ActivityLine {
  id: string;
  verb: string;
  detail?: string;
}

const verbIcon = (verb: string) => {
  const v = verb.toLowerCase();
  if (v.includes("retry")) return Microscope;
  if (v.includes("think")) return Brain;
  if (v.includes("explor") || v.includes("read") || v.includes("map")) return Compass;
  if (v.includes("writ")) return Pencil;
  if (v.includes("run") || v.includes("terminal")) return Terminal;
  if (v.includes("plan")) return Map;
  if (v.includes("verif")) return ShieldCheck;
  if (v.includes("analyz")) return Microscope;
  return FileText;
};

export function ActivityTimeline({
  items,
  streaming = false,
}: {
  items: ActivityLine[];
  streaming?: boolean;
}) {
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);

  const showAll = manualOpen !== null ? manualOpen : streaming || items.length <= 3;

  if (!items.length) return null;

  return (
    <div className="mb-3 rounded-lg border border-[var(--chat-composer-border)] bg-[var(--vscode-textBlockQuote-background,rgba(255,255,255,0.03))] overflow-hidden">
      <button
        type="button"
        onClick={() => setManualOpen(!showAll)}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left hover:bg-[var(--vscode-toolbar-hoverBackground,rgba(255,255,255,0.04))] transition-colors"
        aria-expanded={showAll}
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--chat-muted)" }}
        >
          Agent activity
          <span className="ml-1.5 font-normal opacity-80">({items.length})</span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 opacity-70 transition-transform ${showAll ? "rotate-180" : ""}`}
          style={{ color: "var(--chat-muted)" }}
          strokeWidth={2}
        />
      </button>
      {showAll ? (
        <div className="px-2.5 pb-2 pt-0 space-y-1.5">
          {items.map((line) => {
            const Icon = verbIcon(line.verb);
            return (
              <div key={line.id} className="flex items-start gap-2 text-[11px] leading-snug">
                <Icon
                  size={12}
                  className="shrink-0 mt-0.5 opacity-70"
                  style={{ color: "var(--vscode-symbolIcon-classForeground, #7dd3fc)" }}
                  strokeWidth={2}
                />
                <span className="min-w-0">
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                    {line.verb}
                  </span>
                  {line.detail ? (
                    <span
                      className="font-mono text-[10px] ml-1.5 break-all opacity-80"
                      style={{ color: "var(--chat-muted)" }}
                    >
                      {line.detail}
                    </span>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="px-2.5 pb-2.5 text-[10px] leading-snug"
          style={{ color: "var(--chat-muted)" }}
        >
          {items.length} steps — expand to view the timeline.
        </div>
      )}
    </div>
  );
}
