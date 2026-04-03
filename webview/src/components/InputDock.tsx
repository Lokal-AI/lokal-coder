import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  File,
  Folder,
  Mic,
  Plus,
  Sparkles,
  Square,
  Target,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFetch } from "../hooks/useFetch";
import { useStream } from "../hooks/useStream";
import { useVsCodeApi } from "../hooks/useVsCodeApi";
import { Menu } from "./common/Menu";
import { MentionItem, MentionMenu } from "./MentionMenu";

const CATEGORIES: MentionItem[] = [
  { id: "cat-file", name: "Files", type: "category" },
  { id: "cat-dir", name: "Directories", type: "category" },
  { id: "cat-code", name: "Code Context Items", type: "category", disabled: true },
  { id: "cat-rules", name: "Rules", type: "category", disabled: true },
  { id: "cat-term", name: "Terminal", type: "category", disabled: true },
  { id: "cat-conv", name: "Conversation", type: "category", disabled: true },
  { id: "cat-mcp", name: "MCP Servers", type: "category", disabled: true },
];

export function InputDock() {
  const [inputValue, setInputValue] = useState("");
  const [selectedMentions, setSelectedMentions] = useState<MentionItem[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [activeMode, setActiveMode] = useState("Fast Plan");
  const [selectedModel, setSelectedModel] = useState("Ollama");
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);

  // Mention State
  const [isMentionMenuOpen, setIsMentionMenuOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [mentionAnchorRect, setMentionAnchorRect] = useState<DOMRect | null>(null);
  const [modeAnchorRect, setModeAnchorRect] = useState<DOMRect | null>(null);
  const [modelAnchorRect, setModelAnchorRect] = useState<DOMRect | null>(null);
  const [workspaceItems, setWorkspaceItems] = useState<MentionItem[]>(CATEGORIES);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // ATOMIC SELECTION LOCK: Prevents ghost selections during transitions
  const lastSelectionTimeRef = useRef<number>(0);
  const selectionInProgressRef = useRef<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modeBtnRef = useRef<HTMLButtonElement>(null);
  const modelBtnRef = useRef<HTMLButtonElement>(null);
  const vscode = useVsCodeApi();

  const { data: models } = useFetch<any[]>("listModels");
  const { isStreaming } = useStream((_chunk, id) => {
    if (id !== undefined && id !== null) {
      setCurrentRequestId(String(id));
      setIsWaiting(false);
    }
  });

  const isActive = isWaiting || isStreaming;

  const isInitializedRef = useRef(false);
  useEffect(() => {
    if (!isInitializedRef.current && models && models.length > 0 && selectedModel === "Ollama") {
      isInitializedRef.current = true;
      setTimeout(() => setSelectedModel(models[0].name), 0);
    }
  }, [models, selectedModel]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "workspaceItems") {
        const payload: any[] = message.payload || [];
        const mappedItems: MentionItem[] = payload.map((i: any) => ({
          id: i.relativePath || i.id || i.name,
          name: i.name,
          type: i.type as MentionItem["type"],
          relativePath: i.relativePath,
        }));
        setWorkspaceItems(mappedItems);
        setIsLoadingItems(false);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const closeMentionMenu = useCallback(() => {
    setIsMentionMenuOpen(false);
    setWorkspaceItems(CATEGORIES);
    setMentionFilter("");
  }, []);

  useEffect(() => {
    const handleStreamTerminal = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "streamEnd" || message.type === "streamError") {
        setIsWaiting(false);
        closeMentionMenu();
        return;
      }
      if (
        message.type === "agentUpdate" &&
        (message.payload?.type === "done" || message.payload?.type === "error")
      ) {
        setIsWaiting(false);
      }
    };

    const handleWindowBlur = () => {
      closeMentionMenu();
      setIsModeMenuOpen(false);
      setIsModelMenuOpen(false);
    };

    window.addEventListener("message", handleStreamTerminal);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("message", handleStreamTerminal);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [closeMentionMenu]);

  const handleDockClick = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest("button") ||
      (e.target as HTMLElement).closest('[role="menu"]')
    ) {
      return;
    }
    textareaRef.current?.focus();
  };

  const checkMentionTrigger = (value: string, cursorPosition: number) => {
    // ATOMIC LOCK: Don't reopen the menu if we just selected something
    if (Date.now() - lastSelectionTimeRef.current < 250) return;

    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIdx = textBeforeCursor.lastIndexOf("@");

    if (lastAtIdx === -1) {
      closeMentionMenu();
      return;
    }

    if (lastAtIdx > 0 && textBeforeCursor[lastAtIdx - 1] !== " ") {
      closeMentionMenu();
      return;
    }

    const query = textBeforeCursor.substring(lastAtIdx + 1);

    if (query.includes(" ") || query.length > 60) {
      closeMentionMenu();
      return;
    }

    if (textareaRef.current) {
      const rect = textareaRef.current.getBoundingClientRect();
      setMenuPosition({ top: rect.top, left: rect.left + 10 });
      setMentionAnchorRect(rect);
    }
    setMentionFilter(query);
    setIsMentionMenuOpen(true);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Autoresize
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }

    const cursorPosition = e.target.selectionStart ?? value.length;
    checkMentionTrigger(value, cursorPosition);
  };

  const handleCategoryChange = (cat: string | null) => {
    if (cat) {
      setIsLoadingItems(true);
      setWorkspaceItems([]);
      vscode.postMessage({ command: "listWorkspaceItems", payload: { type: cat } });
    } else {
      setWorkspaceItems(CATEGORIES);
      setIsLoadingItems(false);
    }
  };

  const handleMentionSelect = (item: MentionItem) => {
    // ATOMIC LOCK: Strictly reject any calls if closed, selecting, or recently selected
    if (!isMentionMenuOpen || selectionInProgressRef.current) return;
    if (Date.now() - lastSelectionTimeRef.current < 150) return;

    selectionInProgressRef.current = true;
    lastSelectionTimeRef.current = Date.now();

    // HARD SURGICAL SPLICING: Search specifically for the nearest @ in current text
    // This is more robust than relying on fragile cursor selectionStart which blurs
    const currentVal = inputValue;
    const selection = textareaRef.current
      ? (textareaRef.current.selectionStart ?? currentVal.length)
      : currentVal.length;
    const before = currentVal.substring(0, selection);
    const after = currentVal.substring(selection);
    const atIdx = before.lastIndexOf("@");

    if (atIdx !== -1) {
      const newVal = currentVal.substring(0, atIdx) + after;
      setInputValue(newVal);

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(atIdx, atIdx);
          textareaRef.current.focus();
        }
        selectionInProgressRef.current = false;
      });
    } else {
      selectionInProgressRef.current = false;
    }

    setSelectedMentions((prev: MentionItem[]) => {
      if (prev.some((m) => m.id === item.id)) return prev;
      return [...prev, item];
    });

    closeMentionMenu();
  };

  const handleSend = () => {
    if ((!inputValue.trim() && selectedMentions.length === 0) || isActive) return;
    const requestId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `req-${Date.now()}`;
    setCurrentRequestId(requestId);
    setIsWaiting(true);

    const resolveMode = () => "ASK";

    vscode.postMessage({
      command: "sendMessage",
      payload: {
        text: inputValue,
        mode: resolveMode(),
        model: selectedModel,
        mentions: selectedMentions,
        requestId,
      },
    });

    setInputValue("");
    setSelectedMentions([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleStop = () => {
    if (currentRequestId) {
      vscode.postMessage({ command: "cancelRequest", payload: { id: currentRequestId } });
      setIsWaiting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (isMentionMenuOpen) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape" && isMentionMenuOpen) {
      closeMentionMenu();
    }
  };

  const modeItems = [
    {
      id: "Fast Plan",
      label: "Fast Plan",
      description: "Ask questions or generate quick implementation plans.",
    },
  ];

  const modelItems = models?.map((m) => ({ id: m.name, label: m.name })) || [
    { id: "Ollama", label: "Loading models..." },
  ];

  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      onClick={handleDockClick}
      className={`relative mx-auto w-full max-w-full rounded-xl border bg-[var(--chat-composer-bg)] chat-composer-focus transition-all duration-200 overflow-hidden shadow-xl
        ${isFocused ? "border-transparent" : "border-[var(--chat-composer-border)]"}`}
      style={{
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <MentionMenu
        key={isMentionMenuOpen ? "open" : "closed"}
        isOpen={isMentionMenuOpen}
        onClose={closeMentionMenu}
        items={workspaceItems}
        filter={mentionFilter}
        anchorRect={mentionAnchorRect}
        anchorPoint={menuPosition ? { x: menuPosition.left, y: menuPosition.top } : undefined}
        onSelect={handleMentionSelect}
        onCategoryChange={handleCategoryChange}
        isLoading={isLoadingItems}
        inputRef={textareaRef}
      />

      {/* Chip Row */}
      <AnimatePresence>
        {selectedMentions.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-wrap gap-1 px-2 pt-2 pb-1 overflow-hidden border-b border-white/5 bg-white/[0.01]"
          >
            {selectedMentions.map((mention) => (
              <motion.div
                key={mention.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-all group cursor-default shadow-sm relative z-50"
              >
                <div
                  onClick={() =>
                    mention.type === "file" &&
                    vscode.postMessage({
                      command: "openFile",
                      payload: { path: mention.relativePath || mention.name },
                    })
                  }
                  className={
                    mention.type === "file"
                      ? "cursor-pointer hover:text-sky-400 flex items-center gap-1"
                      : "flex items-center gap-1"
                  }
                >
                  {mention.type === "file" ? (
                    <File size={10} className="text-blue-400 opacity-80" />
                  ) : (
                    <Folder size={10} className="text-amber-400 opacity-80" />
                  )}
                  <span className="text-[9.5px] font-bold text-slate-300 truncate max-w-[120px] tracking-tight">
                    {mention.name}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMentions((prev: MentionItem[]) =>
                      prev.filter((m) => m.id !== mention.id)
                    );
                  }}
                  className="p-0.5 rounded-full hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                >
                  <X size={11} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative px-2 pt-2.5 pb-1">
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputValue}
          disabled={isActive}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={isActive ? "Working…" : "How can I help you today?"}
          className={`w-full bg-transparent border-none focus:ring-0 text-[12px] resize-none py-0.5 min-h-[24px] max-h-56 leading-[1.5] font-medium placeholder:font-normal
            ${isActive ? "cursor-not-allowed opacity-40" : "cursor-text"}`}
          style={{
            color: "var(--text-primary)",
            caretColor: "var(--vscode-editorCursor-foreground, var(--accent-color))",
          }}
        />

        <AnimatePresence>
          {isWaiting && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute right-4 top-3 flex items-center gap-1.5 pointer-events-none"
            >
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] shadow-sm">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-3 h-3 border-2 border-white/10 border-t-sky-400 rounded-full"
                />
                <span
                  className="text-[10px] font-bold tracking-wider uppercase opacity-50"
                  style={{ color: "var(--chat-muted)" }}
                >
                  Working
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between px-1.5 py-1 z-20 gap-1.5 border-t border-white/[0.06] bg-black/[0.1]">
        <div className="flex items-center gap-1 relative min-w-0 flex-1">
          <button
            type="button"
            className="h-7 w-7 inline-flex items-center justify-center rounded-lg hover:bg-white/10 transition-all opacity-40 hover:opacity-100 hover:scale-103 active:scale-97"
            style={{ color: "var(--chat-muted)" }}
            aria-label="Add context"
          >
            <Plus size={14} strokeWidth={2.5} />
          </button>

          <div className="relative">
            <button
              ref={modeBtnRef}
              type="button"
              disabled={isActive}
              onClick={(e) => {
                e.stopPropagation();
                setIsModeMenuOpen(!isModeMenuOpen);
                setIsModelMenuOpen(false);
                setModeAnchorRect(modeBtnRef.current?.getBoundingClientRect() ?? null);
              }}
              className={`flex items-center gap-1.5 h-7 px-1.5 rounded-lg transition-all border border-transparent
                ${isModeMenuOpen ? "bg-white/10 border-white/5 shadow-inner scale-[0.98]" : "hover:bg-white/[0.06] hover:border-white/5"}
                ${isActive ? "opacity-30" : ""}`}
              style={{ color: "var(--chat-muted)" }}
            >
              <Target
                size={12}
                className={`shrink-0 transition-opacity ${isModeMenuOpen ? "opacity-100 text-sky-400" : "opacity-60"}`}
              />
              <span className="text-[9.5px] font-bold tracking-tight truncate">{activeMode}</span>
              <ChevronDown
                size={10}
                className={`shrink-0 transition-all duration-200 ${isModeMenuOpen ? "rotate-180 opacity-100" : "opacity-40"}`}
              />
            </button>
            <Menu
              title="Conversation mode"
              isOpen={isModeMenuOpen}
              onClose={() => setIsModeMenuOpen(false)}
              items={modeItems}
              selectedId={activeMode}
              onSelect={setActiveMode}
              anchorRect={modeAnchorRect}
            />
          </div>

          <AnimatePresence>
            {activeMode === "Fast Plan" && (
              <motion.div
                initial={{ width: 0, opacity: 0, x: -10 }}
                animate={{ width: "auto", opacity: 1, x: 0 }}
                exit={{ width: 0, opacity: 0, x: -10 }}
                className="relative overflow-hidden"
              >
                <button
                  ref={modelBtnRef}
                  type="button"
                  disabled={isActive}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsModelMenuOpen(!isModelMenuOpen);
                    setIsModeMenuOpen(false);
                    setModelAnchorRect(modelBtnRef.current?.getBoundingClientRect() ?? null);
                  }}
                  className={`flex items-center gap-1.5 h-7 px-1.5 rounded-lg transition-all border border-transparent
                    ${isModelMenuOpen ? "bg-white/10 border-white/5 shadow-inner scale-[0.98]" : "hover:bg-white/[0.06] hover:border-white/5"}
                    ${isActive ? "opacity-30" : ""}`}
                  style={{ color: "var(--chat-muted)" }}
                >
                  <Sparkles
                    size={12}
                    className={`shrink-0 transition-opacity ${isModelMenuOpen ? "opacity-100 text-amber-400" : "opacity-60"}`}
                  />
                  <span className="text-[9.5px] font-bold truncate tracking-tight">
                    {selectedModel}
                  </span>
                  <ChevronDown
                    size={10}
                    className={`shrink-0 transition-all duration-200 ${isModelMenuOpen ? "rotate-180 opacity-100" : "opacity-40"}`}
                  />
                </button>
                <Menu
                  title="Model"
                  isOpen={isModelMenuOpen}
                  onClose={() => setIsModelMenuOpen(false)}
                  items={modelItems}
                  selectedId={selectedModel}
                  onSelect={setSelectedModel}
                  anchorRect={modelAnchorRect}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="h-7 w-7 inline-flex items-center justify-center rounded-lg hover:bg-white/10 transition-all opacity-40 hover:opacity-100 hover:scale-103 active:scale-97"
            style={{ color: "var(--chat-muted)" }}
            aria-label="Voice"
          >
            <Mic size={15} strokeWidth={2} />
          </button>

          <AnimatePresence mode="wait">
            {!isActive ? (
              <motion.button
                key="send"
                type="button"
                initial={{ opacity: 0, scale: 0.9, x: 4 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: 4 }}
                onClick={handleSend}
                disabled={!inputValue.trim() && selectedMentions.length === 0}
                className={`h-8 w-8 rounded-lg transition-all flex items-center justify-center shadow-lg
                  ${
                    inputValue.trim() || selectedMentions.length > 0
                      ? "bg-sky-500 text-white hover:bg-sky-400 hover:scale-105 active:scale-95 shadow-sky-500/20"
                      : "bg-white/[0.04] cursor-not-allowed opacity-20"
                  }`}
              >
                <ArrowRight size={18} strokeWidth={3} />
              </motion.button>
            ) : (
              <motion.button
                key="stop"
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={handleStop}
                className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 hover:bg-red-500/10 hover:border-red-500/30 transition-all flex items-center justify-center group"
                style={{ color: "var(--vscode-errorForeground, #f14c4c)" }}
              >
                <Square
                  size={10}
                  fill="currentColor"
                  strokeWidth={0}
                  className="group-hover:scale-110 transition-transform"
                />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
