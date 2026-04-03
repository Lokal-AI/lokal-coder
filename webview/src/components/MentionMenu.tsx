import { motion } from "framer-motion";
import {
  Book,
  ChevronLeft,
  Code,
  File,
  Folder,
  Hash,
  Search,
  Server,
  Terminal,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Portal } from "./common/Portal";

export interface MentionItem {
  id: string;
  name: string;
  type: "file" | "folder" | "category" | "code" | "terminal" | "rule" | "mcp";
  relativePath?: string;
  description?: string;
  disabled?: boolean;
}

interface MentionMenuProps {
  isOpen: boolean;
  onSelect: (item: MentionItem) => void;
  onClose: () => void;
  items: MentionItem[];
  filter: string;
  anchorRect?: DOMRect | null;
  anchorPoint?: { x: number; y: number };
  isLoading?: boolean;
  onCategoryChange?: (category: string | null) => void;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * NUCLEAR FIX: Inner component handles listeners ONLY when mounted.
 * This guarantees that when isOpen is false, listeners are DESTROYED instantly.
 */
function MentionMenuInner({
  onSelect,
  onClose,
  items,
  filter,
  anchorRect,
  anchorPoint,
  isLoading,
  onCategoryChange,
  currentCategory,
  setCurrentCategory,
  selectedIndex,
  setSelectedIndex,
}: MentionMenuProps & {
  currentCategory: string | null;
  setCurrentCategory: (cat: string | null) => void;
  selectedIndex: number;
  setSelectedIndex: (idx: number) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const menuW = 240;
  const menuMaxH = 340;
  const margin = 6;

  const filteredItems = items.filter((i: any) => {
    // Smart visibility for hidden files (e.g. .env)
    // Show if manually typed dot OR if filter specifically contains 'env'
    if (i.isDefaultHidden && !filter.startsWith(".") && !filter.toLowerCase().includes("env")) {
      return false;
    }

    const matchStr = (i.relativePath || i.name).toLowerCase();
    return matchStr.includes(filter.toLowerCase());
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        let next = (selectedIndex + 1) % filteredItems.length;
        if (filteredItems.some((i: any) => !i.disabled)) {
          while (filteredItems[next]?.disabled) {
            next = (next + 1) % filteredItems.length;
          }
        }
        setSelectedIndex(next);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        let next = (selectedIndex - 1 + filteredItems.length) % filteredItems.length;
        if (filteredItems.some((i: any) => !i.disabled)) {
          while (filteredItems[next]?.disabled) {
            next = (next - 1 + filteredItems.length) % filteredItems.length;
          }
        }
        setSelectedIndex(next);
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        const item = filteredItems[selectedIndex];
        if (item && !item.disabled) {
          if (item.type === "category") {
            const cat =
              item.name === "Files" ? "file" : item.name === "Directories" ? "folder" : "all";
            setCurrentCategory(item.name);
            onCategoryChange?.(cat);
            setSelectedIndex(0);
          } else {
            onSelect(item);
          }
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === "Backspace" && !filter && currentCategory) {
        setCurrentCategory(null);
        onCategoryChange?.(null);
        setSelectedIndex(0);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      // If click is outside, close immediately
      if (!menuRef.current?.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true); // Use capture to preempt
    document.addEventListener("mousedown", handleMouseDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("mousedown", handleMouseDown, true);
    };
  }, [
    filteredItems,
    selectedIndex,
    filter,
    currentCategory,
    onSelect,
    onClose,
    onCategoryChange,
    setCurrentCategory,
    setSelectedIndex,
  ]);

  const ar = anchorRect;
  const ap = anchorPoint;
  const ayTop = ar?.top ?? ap?.y ?? window.innerHeight - 80;
  const left = ar
    ? clamp(ar.left, margin, window.innerWidth - menuW - margin)
    : ap
      ? clamp(ap.x, margin, window.innerWidth - menuW - margin)
      : margin;
  const availableH = ayTop - margin * 2;
  const finalMaxH = Math.min(menuMaxH, availableH);

  const getIcon = (item: MentionItem) => {
    if (item.type === "category") {
      if (item.id === "cat-file") return <File size={13} className="text-blue-400" />;
      if (item.id === "cat-dir") return <Folder size={13} className="text-amber-400" />;
    }
    switch (item.type) {
      case "file":
        return <File size={13} className="text-blue-400" />;
      case "folder":
        return <Folder size={13} className="text-amber-400" />;
      case "code":
        return <Code size={13} className="text-purple-400" />;
      case "terminal":
        return <Terminal size={13} className="text-green-400" />;
      case "rule":
        return <Book size={13} className="text-red-400" />;
      case "mcp":
        return <Server size={13} className="text-sky-400" />;
      default:
        return <Hash size={13} className="text-slate-500" />;
    }
  };

  return (
    <Portal>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: "-100%" }}
        transition={{ duration: 0.1 }}
        style={{
          position: "fixed",
          left,
          top: ayTop - 8,
          maxHeight: `${finalMaxH}px`,
          width: `min(${menuW}px, calc(100vw - ${margin * 2}px))`,
          zIndex: 10000, // NUCLEAR: Always highest priority
        }}
        className="overflow-hidden rounded-xl antigravity-glass flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.7)] border border-white/10"
      >
        <div className="px-3 py-2.5 border-b border-white/[0.08] bg-white/[0.03] flex items-center gap-2 shrink-0">
          {currentCategory && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentCategory(null);
                onCategoryChange?.(null);
                setSelectedIndex(0);
              }}
              className="p-1 -ml-1 rounded-md hover:bg-white/10 text-sky-400 transition-colors"
            >
              <ChevronLeft size={14} strokeWidth={3} />
            </button>
          )}
          <span className="flex-1 text-[10px] font-black uppercase tracking-[0.2em] opacity-40 select-none text-[var(--chat-muted)] truncate">
            {currentCategory ? `Searching ${currentCategory}` : "Workspace Mentions"}
          </span>
        </div>

        <div className="p-1.5 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          {isLoading ? (
            <div className="px-3 py-8 text-center opacity-30">
              <Search size={14} className="mx-auto mb-2 animate-pulse" />
              <p className="text-[9px] font-bold uppercase tracking-widest">Scanning...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="px-3 py-8 text-center opacity-20">
              <Search size={14} className="mx-auto mb-2" />
              <p className="text-[9px] font-bold uppercase tracking-widest">No results</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredItems.map((item: any, index: number) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (item.type === "category") {
                        const cat =
                          item.name === "Files"
                            ? "file"
                            : item.name === "Directories"
                              ? "folder"
                              : "all";
                        setCurrentCategory(item.name);
                        onCategoryChange?.(cat);
                        setSelectedIndex(0);
                      } else {
                        onSelect(item);
                      }
                    }}
                    onMouseEnter={() => !item.disabled && setSelectedIndex(index)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-all group flex items-start gap-3 relative border border-transparent
                      ${item.disabled ? "opacity-25 grayscale pointer-events-none" : ""}
                      ${isSelected ? "bg-sky-500/15 border-sky-500/30 shadow-sm" : "hover:bg-white/[0.04]"}`}
                  >
                    <div className={isSelected ? "text-sky-400" : "text-slate-500 opacity-60"}>
                      {getIcon(item)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span
                        className={`text-[9.5px] font-bold leading-tight truncate ${isSelected ? "text-sky-300" : "text-slate-300"}`}
                      >
                        {item.name}
                      </span>
                      {item.relativePath && (
                        <span className="text-[8.5px] opacity-30 truncate font-medium">
                          {item.relativePath}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </Portal>
  );
}

export function MentionMenu(props: MentionMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);

  // State is automatically reset via 'key' in parent when isOpen toggles

  // NUCLEAR: If not open, return NOTHING. No listeners, no DOM, no ghost.
  if (!props.isOpen) return null;

  return (
    <MentionMenuInner
      {...props}
      currentCategory={currentCategory}
      setCurrentCategory={setCurrentCategory}
      selectedIndex={selectedIndex}
      setSelectedIndex={setSelectedIndex}
    />
  );
}
