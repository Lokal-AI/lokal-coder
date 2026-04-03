import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { ConfigService } from "@config/configService";
import { Logger } from "@core/logger";

export class CheckpointPersistenceService {
  private saver: BaseCheckpointSaver | null = null;
  private postgresSaver: PostgresSaver | null = null;

  constructor(
    private logger: Logger,
    private config: ConfigService
  ) {}

  public async initialize(): Promise<BaseCheckpointSaver> {
    if (this.saver) {
      return this.saver;
    }

    const url = this.config.getDatabaseUrl().trim();
    if (!url) {
      this.logger.warn(
        "LangGraph checkpoints: DATABASE_URL / lokal-coder.databaseUrl not set — using in-memory saver (not persisted across restarts)."
      );
      this.saver = new MemorySaver();
      return this.saver;
    }

    try {
      const checkpointer = PostgresSaver.fromConnString(url, { schema: "public" });
      await checkpointer.setup();
      this.postgresSaver = checkpointer;
      this.saver = checkpointer;
      this.logger.info("Postgres LangGraph checkpoint store initialized.");
      return this.saver;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Postgres checkpoint init failed (${message}); falling back to in-memory saver.`
      );
      this.postgresSaver = null;
      this.saver = new MemorySaver();
      return this.saver;
    }
  }

  public getSaver(): BaseCheckpointSaver {
    if (!this.saver) {
      throw new Error("CheckpointPersistenceService not initialized. Call initialize() first.");
    }
    return this.saver;
  }

  public async dispose(): Promise<void> {
    if (this.postgresSaver) {
      try {
        await this.postgresSaver.end();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Postgres checkpoint pool shutdown: ${message}`);
      }
      this.postgresSaver = null;
    }
    this.saver = null;
  }
}
