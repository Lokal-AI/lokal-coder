import { OpenAI } from "openai";
import { ServiceContainer } from "@core/container";
import { Logger } from "@core/logger";

export class OllamaService {
  private client: OpenAI;
  private logger: Logger;

  constructor() {
    this.logger = ServiceContainer.getInstance().resolve<Logger>("Logger");
    this.client = this.createClient();
  }

  private createClient(): OpenAI {
    const config = ServiceContainer.getInstance().resolve<any>("ConfigService");
    const baseURL = config.getOllamaBaseUrl();
    // OpenAI SDK requires a non-empty apiKey; Ollama does not validate it.
    const apiKey = config.getOllamaApiKey().trim() || "ollama";

    this.logger.info(`OpenAI-compatible client baseURL: ${baseURL}`);
    return new OpenAI({
      baseURL,
      apiKey,
    });
  }

  /** Call after configuration changes (see extension activation). */
  public refreshClient(): void {
    this.client = this.createClient();
  }

  /** Ollama model list lives at /api/tags (not under /v1). */
  private getOllamaTagsUrl(): string {
    const config = ServiceContainer.getInstance().resolve<any>("ConfigService");
    const base = config.getOllamaBaseUrl();
    const root = base.replace(/\/?v1\/?$/i, "").replace(/\/$/, "");
    return `${root}/api/tags`;
  }

  public async listModels(): Promise<any[]> {
    try {
      const url = this.getOllamaTagsUrl();
      this.logger.info(`Fetching models from: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Ollama not responding");
      }
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      this.logger.error(`Failed to list models: ${error}`);
      throw error;
    }
  }

  public async *streamChat(
    messages: any[],
    model: string,
    signal?: AbortSignal,
    options?: { maxTokens?: number }
  ) {
    try {
      this.logger.info(`Streaming chat with model: ${model}`);
      const body: OpenAI.Chat.ChatCompletionCreateParamsStreaming = {
        model: model,
        messages: messages,
        stream: true,
      };
      if (options?.maxTokens != null && options.maxTokens > 0) {
        body.max_tokens = options.maxTokens;
      }
      const stream = await this.client.chat.completions.create(body, { signal });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          yield content;
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        this.logger.info("Chat request cancelled by user.");
        return;
      }
      this.logger.error(`Chat error: ${error}`);
      throw error;
    }
  }
}
