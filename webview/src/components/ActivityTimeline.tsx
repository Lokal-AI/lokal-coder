import {
  Brain,
  Check,
  ChevronDown,
  Compass,
  FileText,
  Loader2,
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
  if (v.includes("classif") || v.includes("intent")) return Brain;
  if (v.includes("gather") || v.includes("context")) return Compass;
  if (v.includes("search")) return Microscope;
  if (v.includes("reason")) return Brain;
  if (v.includes("draft")) return Pencil;
  if (v.includes("workspace tool") || v.includes("running tool")) return Terminal;
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

  // Default expanded so multi-step runs are visible; collapsed only after user toggles.
  const showAll = manualOpen !== null ? manualOpen : true;

  if (!items.length) return null;

  return (
    <div className="mb-3 overflow-hidden">
      <button
        type="button"
        onClick={() => setManualOpen(!showAll)}
        className="flex w-full items-center gap-2 py-1.5 text-left transition-colors"
        aria-expanded={showAll}
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-wide inline-flex items-center gap-2"
          style={{ color: "var(--chat-muted)" }}
        >
          {streaming ? (
            <Loader2
              size={12}
              className="shrink-0 animate-spin opacity-90"
              style={{ color: "var(--vscode-symbolIcon-classForeground, #7dd3fc)" }}
              aria-hidden
            />
          ) : null}
          <span className="flex items-center gap-1.5">
            <span className="flex items-center">
              Agent activity
              <span className="ml-1 font-normal opacity-70">({items.length})</span>
              {streaming ? (
                <span className="ml-2 font-normal normal-case tracking-normal opacity-90 text-[10px]">
                  In progress…
                </span>
              ) : null}
            </span>
            <ChevronDown
              size={13}
              className={`shrink-0 opacity-70 transition-transform ${showAll ? "rotate-180" : ""}`}
              style={{ color: "var(--chat-muted)" }}
              strokeWidth={2.5}
            />
          </span>
        </span>
      </button>
      {showAll ? (
        <div className="pb-2 pt-0 space-y-1.5">
          {items.map((line, index) => {
            const Icon = verbIcon(line.verb);
            const isActive = streaming && index === items.length - 1;
            const showStepDone = streaming && index < items.length - 1;
            return (
              <div key={line.id} className=" ml-4 flex items-start gap-2 text-[11px] leading-snug">
                <span className="relative shrink-0 mt-0.5 w-3 h-3 flex items-center justify-center">
                  {isActive ? (
                    <Loader2
                      size={12}
                      className="animate-spin opacity-95"
                      style={{ color: "var(--vscode-symbolIcon-classForeground, #7dd3fc)" }}
                      aria-label="In progress"
                    />
                  ) : (
                    <>
                      <Icon
                        size={12}
                        className={streaming ? "opacity-55" : "opacity-70"}
                        style={{ color: "var(--vscode-symbolIcon-classForeground, #7dd3fc)" }}
                        strokeWidth={2}
                        aria-hidden
                      />
                      {showStepDone ? (
                        <Check
                          size={8}
                          className="absolute -bottom-0.5 -right-0.5 rounded-full bg-[var(--bg-primary)] text-emerald-400/90"
                          strokeWidth={3}
                          aria-hidden
                        />
                      ) : null}
                    </>
                  )}
                </span>
                <span className="min-w-0">
                  <span
                    className={`font-medium ${isActive ? "text-sky-300/95" : ""}`}
                    style={!isActive ? { color: "var(--text-primary)" } : undefined}
                  >
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
        <div className="pb-2.5 text-[10px] leading-snug" style={{ color: "var(--chat-muted)" }}>
          {items.length} steps — expand to view the timeline.
        </div>
      )}
    </div>
  );
}
