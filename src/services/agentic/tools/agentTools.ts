import { ServiceContainer } from "@core/container";
import { FileService } from "@file-service/fileService";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export const createReadFilesTool = () => {
  const fileService = ServiceContainer.getInstance().resolve<FileService>("FileService");

  return new DynamicStructuredTool({
    name: "read_file",
    description:
      "Read the content of a file from the workspace. Use this to examine code or configuration files.",
    schema: z.object({
      path: z.string().describe("The relative path to the file within the workspace."),
    }),
    func: async ({ path }) => {
      try {
        const content = await fileService.readFile(path);
        return `Content of ${path}:\n\n${content}`;
      } catch (error: any) {
        return `Error reading file ${path}: ${error.message}`;
      }
    },
  });
};

export const createListFilesTool = () => {
  const fileService = ServiceContainer.getInstance().resolve<FileService>("FileService");

  return new DynamicStructuredTool({
    name: "list_workspace_files",
    description:
      "List the files and folders in the workspace structure. Useful for understanding the project layout.",
    schema: z.object({
      maxDepth: z
        .number()
        .optional()
        .default(2)
        .describe("The maximum depth of the directory tree to list."),
    }),
    func: async ({ maxDepth }) => {
      try {
        const map = await fileService.getProjectMap(maxDepth);
        return `Workspace Structure (Depth: ${maxDepth}):\n\n${map}`;
      } catch (error: any) {
        return `Error listing workspace files: ${error.message}`;
      }
    },
  });
};

export const createSummarizeFileTool = () => {
  const fileService = ServiceContainer.getInstance().resolve<FileService>("FileService");

  return new DynamicStructuredTool({
    name: "summarize_file",
    description:
      "Provides a high-level technical summary of a file, including its main exports, dependencies, and core logic.",
    schema: z.object({
      path: z.string().describe("The relative path to the file to summarize."),
    }),
    func: async ({ path }) => {
      try {
        const content = await fileService.readFile(path);
        // In a real implementation, we might use an LLM model specifically here or just return content for the agent to summarize.
        // For Layer 0, we return the content so the agent's internal prompt can summarize it.
        return `File content for summarization (${path}):\n\n${content}`;
      } catch (error: any) {
        return `Error reading file ${path} for summarization: ${error.message}`;
      }
    },
  });
};
