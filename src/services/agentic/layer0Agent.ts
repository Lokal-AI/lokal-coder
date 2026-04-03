import { ConfigService } from "@config/configService";
import { ServiceContainer } from "@core/container";
import { Logger } from "@core/logger";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { CheckpointPersistenceService } from "@persistence/checkpointPersistence";
import {
  createListFilesTool,
  createReadFilesTool,
  createSummarizeFileTool,
} from "./tools/agentTools";
import { createListDirectoryTool, createSearchCodeTool } from "./tools/searchTools";

function textFromLCContent(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          const t = (part as { text?: string }).text;
          return typeof t === "string" ? t : "";
        }
        return "";
      })
      .join("");
  }
  return String(content);
}

function toolCallArgs(input: unknown): Record<string, unknown> {
  if (input == null || typeof input !== "object") return {};
  const o = input as Record<string, unknown>;
  if ("input" in o && o.input != null && typeof o.input === "object" && !Array.isArray(o.input)) {
    return o.input as Record<string, unknown>;
  }
  return o;
}

/** Multi-step tool workflow: discover → read → conclude (no one-shot search + “want more?”). */
const LAYER0_CHATBOT_SYSTEM = `You are **Lokal Coder** inside a **VS Code / Cursor extension** workspace.

**Stack**: TypeScript / JavaScript (extension host + React webview). Do **not** invent languages, paths, or tool output. Never cite files you did not read via tools in this conversation.

**Tool workflow (follow until the user’s request is fully met)**
1. **Discover** — Use \`search_code\` and/or \`list_workspace_files\` / \`list_directory_contents\` to locate real paths. Copy paths **exactly** from tool output; never add filenames that did not appear.
2. **Deep read** — For “where is X / how does Y work / check the codebase”: open the important files with \`read_file\` or \`summarize_file\`. If you list matches, you must **read** at least the primary implementation file before summarizing.
3. **Answer** — Give one clear, self-contained reply: what you found, where it lives, and how it fits the question. **Do not** stop after step 1 with only a match list. **Do not** end with “Would you like…?” if you can continue with \`read_file\` / \`summarize_file\` instead.
4. If tools find nothing, say so honestly and suggest better search terms—never fabricate code or paths.

**Layer 0** in this repo is typically under \`src/services/agentic/\` (e.g. \`layer0Agent.ts\`)—still **verify** with \`search_code\` for \`Layer0Agent\`, \`layer0\`, etc.`;

export interface Layer0Result {
  content: string;
  isActionable: boolean;
  intent?: string;
}

export class Layer0Agent {
  private logger: Logger;
  private config: ConfigService;
  private persistence: CheckpointPersistenceService;
  private tools: any[];
  private model: ChatOpenAI;
  private reactGraph: ReturnType<typeof createReactAgent> | null = null;

  constructor() {
    const container = ServiceContainer.getInstance();
    this.logger = container.resolve<Logger>("Logger");
    this.config = container.resolve<ConfigService>("ConfigService");
    this.persistence = container.resolve<CheckpointPersistenceService>(
      "CheckpointPersistenceService"
    );

    // Initialize tools
    this.tools = [
      createReadFilesTool(),
      createListFilesTool(),
      createSummarizeFileTool(),
      createSearchCodeTool(),
      createListDirectoryTool(),
    ];

    // Initialize model
    const ollamaKey = this.config.getOllamaApiKey().trim() || "ollama";
    this.model = new ChatOpenAI({
      // @langchain/openai v1 uses `apiKey`, not `openAIApiKey`; Ollama ignores the value.
      apiKey: ollamaKey,
      configuration: {
        baseURL: this.config.getOllamaBaseUrl(),
      },
      modelName: this.config.getLayer0Model(),
      streaming: true,
      temperature: 0.2,
    });
  }

  /** Lightweight routing: no extra messages in checkpointed thread state. */
  private async classifyIntent(text: string, signal?: AbortSignal): Promise<boolean> {
    const prompt = `Analyze the following user input and classify its intent.

Intents:
1. CONVERSATION: General questions, greetings, or requests for information/summarization of files using tools.
2. ACTIONABLE: Requests to modify code, create files, run terminal commands, or perform complex coding tasks.

User Input: ${JSON.stringify(text)}

Respond ONLY with the classification: CONVERSATION or ACTIONABLE.`;

    const response = await this.model.invoke([new HumanMessage(prompt)], { signal });
    const content = textFromLCContent(response.content).toUpperCase();
    return content.includes("ACTIONABLE");
  }

  private getReactGraph() {
    if (!this.reactGraph) {
      this.reactGraph = createReactAgent({
        llm: this.model,
        tools: this.tools,
        messageModifier: new SystemMessage(LAYER0_CHATBOT_SYSTEM),
        checkpointer: this.persistence.getSaver(),
      });
    }
    return this.reactGraph;
  }

  public async run(
    text: string,
    threadId: string,
    onChunk?: (chunk: string) => void,
    onActivity?: (verb: string, detail?: string) => void,
    signal?: AbortSignal
  ): Promise<Layer0Result> {
    await this.persistence.initialize();
    this.logger.info(`🚀 Starting Layer 0 run for thread: ${threadId}`);

    onActivity?.("Classifying intent", undefined);
    const isActionable = await this.classifyIntent(text, signal);
    if (isActionable) {
      this.logger.info("🎯 Intent: ACTIONABLE — skipping ReAct agent");
      return { content: "", isActionable: true };
    }

    const graph = this.getReactGraph();
    const config = {
      configurable: { thread_id: threadId },
      recursionLimit: 48,
    };
    const input = { messages: [new HumanMessage(text)] };

    let finalContent = "";

    const eventStream = await graph.streamEvents(input, {
      ...config,
      version: "v2",
      signal: signal,
    });

    // One milestone after intent — avoid on_chain_start (LangGraph fires it many times per model/tool step).
    onActivity?.("Gathering context", undefined);

    for await (const event of eventStream) {
      const eventType = event.event;

      if (eventType === "on_chat_model_stream") {
        const chunk = event.data?.chunk as { content?: unknown } | undefined;
        const piece = textFromLCContent(chunk?.content);
        if (piece) {
          finalContent += piece;
          onChunk?.(piece);
        }
      } else if (eventType === "on_chat_model_end") {
        const output = event.data?.output as { content?: unknown } | undefined;
        const full = textFromLCContent(output?.content ?? output);
        if (full.length > finalContent.length) {
          const delta = full.slice(finalContent.length);
          if (delta) {
            finalContent += delta;
            onChunk?.(delta);
          }
        }
      } else if (eventType === "on_tool_start" && onActivity) {
        const toolName = event.name;
        const input = toolCallArgs(event.data?.input);

        let verb = "Using tool";
        let detail: string | undefined;

        if (toolName === "read_file") {
          verb = "Reading file";
          detail = String(input.path ?? "") || undefined;
        } else if (toolName === "search_code") {
          verb = "Searching code";
          const q = String(input.query ?? "").trim();
          const inc =
            input.include != null && String(input.include).trim() !== ""
              ? String(input.include).trim()
              : "";
          detail = inc ? `${q || "(empty)"} · glob ${inc}` : q || undefined;
        } else if (toolName === "list_directory_contents") {
          verb = "Exploring directory";
          detail = String(input.path ?? "") || undefined;
        } else if (toolName === "summarize_file") {
          verb = "Analyzing file";
          detail = String(input.path ?? "") || undefined;
        } else if (toolName === "list_workspace_files") {
          verb = "Mapping workspace";
          detail = input.maxDepth != null ? `depth ${String(input.maxDepth)}` : undefined;
        } else {
          const raw = JSON.stringify(input).slice(0, 200);
          detail = raw || undefined;
        }

        onActivity(verb, detail);
      }
    }

    this.logger.info(`✅ Layer 0 run complete. Actionable: ${isActionable}`);

    return {
      content: finalContent,
      isActionable,
    };
  }
}
