import * as vscode from "vscode";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export const createSearchCodeTool = () => {
  return new DynamicStructuredTool({
    name: "search_code",
    description:
      "Search for a specific string across all non-ignored files in the workspace. Returns matching lines with context.",
    schema: z.object({
      query: z.string().describe("The string to search for."),
      include: z
        .string()
        .optional()
        .describe("Optional glob pattern for files to include (e.g. '**/*.ts')."),
    }),
    func: async ({ query, include }) => {
      const results: string[] = [];
      const config = vscode.workspace.getConfiguration("lokal-coder");
      const defaults = config.get<string[]>("defaultExclusions") || [];
      const excludePattern = `**/{${defaults.join(",")}}/**`;

      try {
        const uris = await vscode.workspace.findFiles(include || "**/*", excludePattern, 100);

        for (const uri of uris) {
          const data = await vscode.workspace.fs.readFile(uri);
          const content = new TextDecoder().decode(data);
          const lines = content.split("\n");

          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(query.toLowerCase())) {
              const relPath = vscode.workspace.asRelativePath(uri);
              results.push(`${relPath}:${i + 1}: ${lines[i].trim()}`);
              if (results.length >= 50) break;
            }
          }
          if (results.length >= 50) break;
        }

        if (results.length === 0) return `No matches found for "${query}".`;
        return `Found ${results.length} matches for "${query}":\n\n${results.join("\n")}`;
      } catch (error: any) {
        return `Error searching for "${query}": ${error.message}`;
      }
    },
  });
};

export const createListDirectoryTool = () => {
  return new DynamicStructuredTool({
    name: "list_directory_contents",
    description:
      "Lists the immediate files and folders in a specific directory (non-recursive). Use this to explore the project structure.",
    schema: z.object({
      path: z.string().describe("The relative path of the directory to list."),
    }),
    func: async ({ path: dirPath }) => {
      try {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) return "No workspace folder open.";

        const rootUri = folders[0].uri;
        const uri = dirPath ? vscode.Uri.joinPath(rootUri, dirPath) : rootUri;
        const entries = await vscode.workspace.fs.readDirectory(uri);

        const contents = entries.map(([name, type]) => {
          const isDir = !!(type & vscode.FileType.Directory);
          return `${isDir ? "📁" : "📄"} ${name}`;
        });

        // Alphabetical sort (folders first)
        contents.sort();

        return `Contents of ${dirPath || "(root)"}:\n\n${contents.length > 0 ? contents.join("\n") : "(Empty directory)"}`;
      } catch (error: any) {
        return `Error listing directory ${dirPath}: ${error.message}`;
      }
    },
  });
};
