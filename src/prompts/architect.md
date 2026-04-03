# Lokal Coder — High-Level Architecture (HLD)

Use this document when reasoning about **how the extension is structured**, **where logic lives**, and **how data moves**. Diagrams are [Mermaid](https://mermaid.js.org/); keep mental model aligned with the **TypeScript** extension host + **React** webview (not Python).

---

## 1. System context

```mermaid
flowchart LR
  subgraph editor [VS_Code_or_Cursor]
    subgraph host [Extension_Host_Node]
      Ext[lokal-coder_extension]
    end
    subgraph ui [Webview_Sandbox]
      React[React_UI_Vite]
    end
    Ext <-->|postMessage| React
  end

  Ollama[Ollama_OpenAI_compatible_API]
  PG[(Supabase_Postgres_DATABASE_URL)]
  SBAPI[Supabase_HTTP_REST_auth]

  Ext -->|ChatOpenAI_baseURL| Ollama
  Ext -->|pg_PostgresSaver| PG
  React -->|supabase-js_anon| SBAPI
  Ext -->|supabase-js_service_role| SBAPI
```

---

## 2. Runtime components (service locator)

```mermaid
flowchart TB
  EP[extension.ts_activate]

  subgraph container [ServiceContainer]
    direction TB
    Log[Logger]
    Ctx[ExtensionContext]
    CFG[ConfigService]
    Oll[OllamaService]
    CtxSvc[ContextService]
    FS[FileService]
    CP[CheckpointPersistenceService]
    ChatP[ChatPersistenceService]
    MR[MessageRouter]
  end

  WVP[ChatWebviewProvider]

  EP --> Log
  EP --> Ctx
  EP --> CFG
  EP --> Oll
  EP --> CtxSvc
  EP --> FS
  EP --> CP
  EP --> ChatP
  EP --> MR
  EP --> WVP

  MR -->|resolve| FS
  MR -->|resolve| ChatP
  MR -->|resolve| Oll
```

---

## 3. Chat turn: webview to Layer 0 (Fast Plan path)

```mermaid
sequenceDiagram
  participant W as Webview_React
  participant R as MessageRouter
  participant L0 as Layer0Agent
  participant O as Ollama_ChatOpenAI
  participant T as LangGraph_tools
  participant F as FileService

  W->>R: sendMessage_text_model
  R->>W: updateMessages_user
  R->>L0: run_enrichedText_threadId_onChunk_onActivity

  Note over L0: classifyIntent_optional_early_exit_ACTIONABLE

  loop createReactAgent_ReAct
    L0->>O: bindTools_invoke_streamEvents
    O-->>L0: tokens_tools_calls
    L0->>T: DynamicStructuredTool_exec
    T->>F: readFile_getProjectMap_findFiles
    F-->>T: tool_result_string
    T-->>L0: ToolMessage
  end

  L0-->>R: Layer0Result_content_isActionable
  loop stream
    R->>W: streamChunk_activityLine
  end
  R->>W: streamEnd
  R->>ChatP: appendMessage_optional_Supabase
```

---

## 4. Layer 0 internal flow

```mermaid
flowchart TD
  Start[User_message] --> Intent[classifyIntent_LLM_no_tools]
  Intent -->|ACTIONABLE| DoneEarly[Return_isActionable_true]
  Intent -->|CONVERSATION| React[createReactAgent_graph]

  subgraph reactLoop [LangGraph_ReAct_loop]
    React --> Model[ChatOpenAI_streaming_Ollama]
    Model -->|tool_calls| ToolNode[ToolNode]
    ToolNode --> Tools[read_file_list_workspace_files_summarize_file_search_code_list_directory]
    Tools --> Model
    Model -->|no_tool_calls| EndReact[Graph_end]
  end

  EndReact --> Out[Stream_events_to_UI_chunks_activities]

  subgraph persist [Thread_state]
    CP[(PostgresSaver_or_MemorySaver_checkpoint)]
  end

  React -.->|checkpointer_thread_id| CP
```

---

## 5. Persistence split

```mermaid
flowchart LR
  subgraph userVisible [Chat_UI_history_Supabase]
    SB[(Postgres_via_PostgREST)]
    Tables[chat_sessions_chat_messages]
    SB --- Tables
  end

  subgraph agentState [LangGraph_checkpoints]
    PG[(Postgres_DATABASE_URL)]
    Mem[MemorySaver_fallback]
    CP[PostgresSaver_or_MemorySaver]
    PG -.-> CP
    Mem -.-> CP
  end

  ChatSvc[ChatPersistenceService] --> SB
  ChkSvc[CheckpointPersistenceService] --> CP
```

---

## 6. Key file map (anchor for “where is X?”)

| Concern                           | Primary location                                                                |
| --------------------------------- | ------------------------------------------------------------------------------- |
| Activation & DI wiring            | `src/extension.ts`                                                              |
| Webview ↔ host bridge             | `src/services/chat/messageRouter.ts`, `src/services/webview/webviewProvider.ts` |
| Layer 0 agent (intent + ReAct)    | `src/services/agentic/layer0Agent.ts`                                           |
| Workspace tools                   | `src/services/agentic/tools/agentTools.ts`, `searchTools.ts`                    |
| Ollama / OpenAI-compatible client | `src/services/llms/ollamaService.ts`, `ChatOpenAI` in Layer0                    |
| Supabase chat CRUD                | `src/services/chat/chatPersistenceService.ts`                                   |
| LangGraph checkpointer            | `src/services/persistence/checkpointPersistence.ts`                             |
| Settings & `.env` overlay         | `src/services/config/configService.ts`                                          |
| Web UI state & streaming          | `webview/src/contexts/SessionContext.tsx`, `webview/src/App.tsx`                |

---

_This HLD reflects the extension as a **TypeScript** VS Code project. Layer 1+ planner/executor flows may extend this diagram when implemented._
