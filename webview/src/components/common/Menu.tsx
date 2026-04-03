import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Portal } from "./Portal";

interface MenuItem {
  id: string;
  label: string;
  description?: string;
  tag?: string;
}

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: MenuItem[];
  onSelect: (id: string) => void;
  selectedId: string;
  title: string;
  anchorRect?: DOMRect | null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function Menu({
  isOpen,
  onClose,
  items,
  onSelect,
  selectedId,
  title,
  anchorRect,
}: MenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const menuW = 230; // High-density width
  const menuMaxH = 340;
  const margin = 6;
  const ar = anchorRect;

  const spaceAbove = ar ? ar.top : 0;
  const spaceBelow = ar ? window.innerHeight - ar.bottom : 0;

  // Prioritize opening above since this is a bottom-docked chat
  const openAbove = ar ? spaceAbove > 160 || spaceAbove > spaceBelow : true;

  // Dynamic max height to prevent off-screen cropping
  const availableH = openAbove ? spaceAbove - margin * 2 : spaceBelow - margin * 2;
  const finalMaxH = Math.min(menuMaxH, availableH);

  const left = ar ? clamp(ar.left, margin, window.innerWidth - menuW - margin) : margin;
  const top = ar ? (openAbove ? ar.top - 8 : ar.bottom + 8) : margin;

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (!isOpen) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      onClose();
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleMouseDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Portal>
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: openAbove ? -20 : 20 }}
            animate={{ opacity: 1, scale: 1, y: openAbove ? "-100%" : 0 }}
            exit={{ opacity: 0, scale: 0.95, y: openAbove ? -20 : 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            style={{
              position: "fixed",
              left,
              top,
              maxHeight: `${finalMaxH}px`,
              width: `min(${menuW}px, calc(100vw - ${margin * 2}px))`,
            }}
            className="z-50 overflow-hidden rounded-2xl antigravity-glass flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
          >
            <div className="px-4 py-2.5 border-b border-white/[0.08] bg-white/[0.03] flex items-center justify-between shrink-0">
              <span
                className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 select-none"
                style={{ color: "var(--chat-muted)" }}
              >
                {title}
              </span>
            </div>

            <div className="p-1.5 overflow-y-auto custom-scrollbar flex-1 min-h-0">
              <div className="space-y-1">
                {items.map((item) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelect(item.id);
                        onClose();
                      }}
                      className={`w-full text-left px-2.5 py-1.25 rounded-xl transition-all group relative items-center gap-3
                        ${
                          isSelected
                            ? "bg-sky-500/10 border-sky-500/20 shadow-[inset_0_0_8px_rgba(14,165,233,0.05)]"
                            : "hover:bg-white/[0.04]"
                        }`}
                      style={{
                        border: isSelected
                          ? "1px solid rgba(14,165,233,0.3)"
                          : "1px solid transparent",
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`text-[9.5px] font-bold tracking-tight transition-colors duration-200
                            ${isSelected ? "text-sky-400" : "text-[var(--text-primary)] group-hover:text-white"}`}
                        >
                          {item.label}
                        </span>
                        {item.tag && (
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest
                              ${isSelected ? "bg-sky-500/20 text-sky-300" : "bg-white/5 text-[var(--chat-muted)] opacity-60"}`}
                          >
                            {item.tag}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p
                          className={`mt-0.5 text-[8.5px] leading-relaxed transition-opacity duration-200
                          ${isSelected ? "text-sky-300/60" : "text-[var(--chat-muted)] opacity-50 group-hover:opacity-80"}`}
                        >
                          {item.description}
                        </p>
                      )}

                      {isSelected && (
                        <motion.div
                          layoutId="menu-selection-glow"
                          className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-[2.5px] h-3.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
}
