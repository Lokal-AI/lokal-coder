import { File, Folder } from "lucide-react";

export interface WorkspaceItem {
  id: string;
  name: string;
  type: "file" | "folder";
  relativePath?: string;
}

interface WorkspaceExplorerProps {
  items: WorkspaceItem[];
  onOpenFile: (path: string) => void;
}

export function WorkspaceExplorer({ items, onOpenFile }: WorkspaceExplorerProps) {
  const folders = items
    .filter((i) => i.type === "folder")
    .sort((a, b) => (a.relativePath || a.name).localeCompare(b.relativePath || b.name));
  const files = items
    .filter((i) => i.type === "file")
    .sort((a, b) => (a.relativePath || a.name).localeCompare(b.relativePath || b.name));

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-1.5 py-2">
      <div
        className="text-[9px] uppercase tracking-wider font-semibold px-2 pb-2 opacity-80"
        style={{ color: "var(--chat-muted)" }}
      >
        Workspace
      </div>
      <div className="space-y-0.5">
        {folders.map((item) => (
          <div
            key={`folder-${item.id}`}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] opacity-75"
            style={{ color: "var(--chat-muted)" }}
            title={item.relativePath || item.name}
          >
            <Folder size={12} />
            <span className="truncate">{item.relativePath || item.name}</span>
          </div>
        ))}
        {files.map((item) => (
          <button
            key={`file-${item.id}`}
            type="button"
            onClick={() => onOpenFile(item.relativePath || item.name)}
            className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-left text-[10px] hover:bg-[var(--vscode-toolbar-hoverBackground,rgba(255,255,255,0.06))]"
            style={{ color: "var(--text-primary)" }}
            title={item.relativePath || item.name}
          >
            <File size={12} style={{ color: "var(--vscode-symbolIcon-fileForeground)" }} />
            <span className="truncate">{item.relativePath || item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
