# Lokal Coder Agent Features & Implementation

This document defines the structured Epics, User Stories, and formal Acceptance Criteria essential for building the Lokal Coder Agent based on the conceptual design outlined in `requirements.md`.

## Phase 0: Initial Code Setup & Extension Initialization

### Epic 0: Project Scaffolding & Baselines

- **[x] User Story 0.1: Initial VSCode Extension Setup**
  - **As a** developer,
  - **I want to** initialize the VSCode extension from scratch
  - **So that** I have a working build with zero dependencies as a baseline.
  - **Acceptance Criteria**:
    - The repository is scaffolded using standard extension generation (e.g., `yo code`).
    - The initial build compiles and boots successfully in the Extension Development Host.

- **[x] User Story 0.2: Constants & Environment Configurations**
  - **As a** developer,
  - **I want to** define constant files and environment variables correctly from day one
  - **So that** magic strings and configuration endpoints aren't scattered throughout the code.
  - **Acceptance Criteria**:
    - A dedicated configuration/constants module is established.
    - Environment settings are securely parsed, strictly typed, and isolated.

- **[x] User Story 0.3: Initial Chat Webview Integration**
  - **As a** user,
  - **I want** the chat window to successfully open upon activating the extension command
  - **So that** subsequent phases have a shell UI to attach logic to.
  - **Acceptance Criteria**:
    - Running the activation command successfully mounts and opens a basic Webview panel in the editor.

---

## Phase 1: Architectural Foundation & UI State Configuration

### Epic 1: Core System Architecture

- **[x] User Story 1.1: Dependency Injection**
  - **As a** developer,
  - **I want to** implement Dependency Injection (DI)
  - **So that** services (Terminal, FileSystem, AI) are singleton instances that can be securely handled and easily mocked.
  - **Acceptance Criteria**:
    - The DI container is fully initialized upon extension activation.
    - All services are strictly registered to and resolvable via the container.

- **[x] User Story 1.2: Mediator Pattern for Message Routing**
  - **As a** developer,
  - **I want to** implement the Mediator Pattern for the Message Router
  - **So that** the Webview and Extension Host communicate securely without direct coupling.
  - **Acceptance Criteria**:
    - Message payload schemas are formally defined (e.g., `{ command, payload }`).
    - A centralized router correctly delegates incoming Webview commands to the related backend services without exposing internal mechanisms.

- **[x] User Story 1.3: Command Pattern for Action Execution**
  - **As a** developer,
  - **I want to** use the Command Pattern for Lokal Coder actions
  - **So that** every file modification or terminal command executed by the AI can be undone discretely.
  - **Acceptance Criteria**:
    - A base `Command` interface is implemented, enforcing `execute()` and `undo()` protocols.
    - AI actions are consistently instantiated as concrete Command objects before triggering any side effects.

### Epic 2: Frontend Strategy & Mode Selection UI

- **[x] User Story 2.1: Multi-Mode Selection UI**
  - **As a** user,
  - **I want** a mode selection toggler in my chat interface (Ask vs. Plan Strategy vs. Agent Execute)
  - **So that** I have precise control over how the AI interprets and acts upon my intent.
  - **Acceptance Criteria**:
    - The Webview contains a functional dropdown/toggle specifically showing the 3 modes.
    - User selection updates state locally and packages the JSON payload as `mode: "ASK" | "PLAN" | "AGENT"`.

- **[x] User Story 2.2: Plan Review and Smooth Agent Handoff**
  - **As a** user,
  - **I want** an interactive, step-by-step Plan presented when I select Plan Mode, followed by an "Execute This Plan" button
  - **So that** I can confidently review the strategy before committing to execution.
  - **Acceptance Criteria**:
    - The returned Plan securely renders as Markdown in the Webview.
    - An injected "Execute This Plan" button correctly triggers the Agent execution workflow, dynamically bypassing the current dropdown state and adopting "AGENT".

---

## Phase 2: Workspace Access, API Routing, and Code Generation

### Epic 3: Extension Configuration & API Routing Rules

- **[x] User Story 3.1: External Target Configurations**
  - **As a** user,
  - **I want to** configure my API endpoints and securely store keys in the user settings
  - **So that** the extension can target custom internal or external LLM platforms flexibly.
  - **Acceptance Criteria**:
    - The extension strictly contributes `lokal-coder.apiBaseUrl`, `lokal-coder.agentEndpoint`, `lokal-coder.planningEndpoint`, and `lokal-coder.apiKey` configurations.
    - `apiBaseUrl` and `apiKey` are read by `OllamaService` (OpenAI-compatible client); `agentEndpoint` / `planningEndpoint` are reserved for future HTTP backends. Model listing uses the host derived from `apiBaseUrl` (`/api/tags` for Ollama).

- **[x] User Story 3.2: Traffic Cop API Routing**
  - **As a** backend developer,
  - **I need** to implement traffic routing rules inside the extension that respect user-selected intent modes.
  - **Acceptance Criteria**:
    - `mode: PLAN` payloads route specifically to the planning endpoint.
    - `mode: AGENT` payloads route securely to the execution engine.
    - `mode: ASK` payloads route cleanly to a conversational/query processing endpoint.

### Epic 4: Advanced Context Gathering Engine

- **[x] User Story 4.1: Active Context Aggregation**
  - **As the** AI,
  - **I need** active context surrounding the user's workflow dynamically
  - **So that** I can write accurate, relevant code right off the bat.
  - **Acceptance Criteria**:
    - An active service listens dynamically, grabbing the active file, workspace paths, selected language ID, highlighted rows, and real-time active linter diagnostics (errors/warnings), merging them securely to the prompt Context Packet.

- **[x] User Story 4.2: Hierarchical Directory Mapping**
  - **As the** AI,
  - **I need** a structural map of the given project
  - **So that** I deeply understand the layout and internal logic of the app architecture.
  - **Acceptance Criteria**:
    - An indexing utility scans the top-level structure (ignoring bloated folders natively e.g., `.git`, `node_modules`).
    - Serializes efficiently for the AI context payload.

### Epic 5: Code Diff System & Safeties

- **[x] User Story 5.1: Virtual Diff View Gateway**
  - **As a** user,
  - **I want** to cautiously review all sweeping code updates via Virtual Diffs before any destructive file edits happen.
  - **Acceptance Criteria**:
    - AI emits strict Unified Diff strings.
    - The `FileSystemService` translates these into `WorkspaceEdit` objects, popping open the native VS Code Diff visualizer.
    - Unconditionally blocks writing directly to disk unless an explicit "Accept" action triggers.

- **[x] User Story 5.2: Instant Project Scaffolding Engine**
  - **As a** user,
  - **I want** the agent to scaffold entirely new project branches/apps rapidly from simple text prompts.
  - **Acceptance Criteria**:
    - The `FileSystemService` anticipates a clean JSON array structure of complete path definitions and content.
    - Triggers a batch write to iteratively map massive directories asynchronously.

---

## Phase 3: Terminal Access & Execution Engine

### Epic 6: Sandbox Terminal Systems

- **[x] User Story 6.1: Background Node Command Execution**
  - **As the** AI,
  - **I want to** test loops silently via standard terminal commands, capturing standard output directly in my memory stream.
  - **Acceptance Criteria**:
    - A distinct background `child_process` routine handles commands in a non-blocking path.
    - `stdout` / `stderr` perfectly pipelines directly into the LLM system memory.

- **[x] User Story 6.2: Transparent Pseudoterminal Mirroring**
  - **As a** user,
  - **I want to** gaze into the background command loops the AI executes through standard VS Code Terminal visualizations.
  - **Acceptance Criteria**:
    - A uniquely tailored, read-only Pseudoterminal hooks onto the logging feed from Epic 6.1.
    - Mirrors live streams beautifully.

- **[x] User Story 6.3: Destructive Hard Blocks**
  - **As a** user,
  - **I want** ironclad limits barring the system from accidentally firing destructive kernel-level system operations.
  - **Acceptance Criteria**:
    - `TerminalService` actively scrubs instructions against a strict `Action Whitelist`.
    - Automatically captures risky operations (e.g., `rm -rf`, `git reset`) with an explicit "Yes/No" popup blocking command instantiation entirely.

---

## Phase 4: The Autonomous Agentic Feedback Loop

### Epic 7: Comprehensive Loop Framework

- **[x] User Story 7.1: AI Action Router Interpreter**
  - **As the** execution loop engine,
  - **I need** an Action Router dedicated explicitly to bridging the gap between flat JSON outputs from the LLM and the local services defined in Epic 1.
  - **Acceptance Criteria**:
    - Payload schemas rigorously execute mapped routines for `FILE_CREATE`, Virtual `FILE_EDIT`, or `TERMINAL_RUN`.

- **[x] User Story 7.2: Auto-Verification via VS Code Diagnostic Scrapes** _(baseline)_
  - **As an** autonomous agent,
  - **I want** to test and verify my execution step internally without user intervention if the underlying tools report failure.
  - **Acceptance Criteria**:
    - Following an 'Execute' step trigger, the backend fires requests targeting editor compiler/linter statuses iteratively.
    - Stderr footprints automatically trigger internal ping loops directly back to the LLM backend for instant correction.
  - **Implementation note:** After `read_file`, `write_file`, and `batch_read`, workspace diagnostics for touched paths are appended to the tool result as `[VERIFICATION / DIAGNOSTICS]` so the next model turn can react. Fully automated re-prompt loops without user action remain optional (see 7.3).

- **[ ] User Story 7.3: Auto-Step Progression Control**
  - **As the** mediator workflow,
  - **I want** to push the AI forward rapidly through their given phase plan given full successful conditions.
  - **Acceptance Criteria**:
    - Empty error statuses following step verifications prompt a seamless hidden push to the `agentEndpoint`: "Step X successful. Ready for Step Y."
    - This happens fluidly until all initial proposed plan steps finish cleanly.

---

## Phase 5: Agent & Tool Engineering (Infrastructure Only) [DONE]

### Epic 8: Specialized Agent Identity Foundation [DONE]

- **[x] User Story 8.1: Formal Agent Profile Definitions (Identity, Role, Goal)**
  - **As a** developer,
  - **I want to** define a library of specialized agent identities:
    - **Planning Architect**: 🏗️ Task analysis, Architectural decomposition, and Local Plan Generation (.lokal-coder/).
    - **Senior Developer**: 💻 Feature implementation, Code writing, Feature logic.
    - **QA Engineer**: 🧪 Testing, Verification, Criteria check.
    - **Debug Specialist**: 🕵️ Root-cause analysis, Fix proposals.
    - **Technical Writer**: 📚 Documentation, API docs, README.
    - **Security Auditor**: 🛡️ Vulnerabilities, Dependency safety.
    - **Performance Guru**: ⚡ Optimization, Latency, Resource management.
    - **Support Analyst (Q&A)**: 💬 General queries, Code explanation.
    - **Product Manager**: 📋 Task decomposition, Story refinement.
    - **Refactoring Expert**: 🧹 Code smells, DRY/SOLID principles.
  - **Acceptance Criteria**:
    - A centralized `AgentRegistry` is established with the unique `role`, `goal`, `backstory`, and `systemPrompt` for all 10+ roles.

- **[x] User Story 8.2: Agent-Specific Persona & Voice Consistency**
  - **As a** user,
  - **I want** each agent to respond in a way that reflects their specialized role.
  - **Acceptance Criteria**:
    - The LLM prompt injection system swaps between personas based on the assigned agent.

### Epic 9: Advanced Agentic Tool Synthesis [DONE]

- **[x] User Story 9.1: Local Checkpoint & Planning Tool**
  - **As a** Planning Architect,
  - **I need** a tool that can create a `.lokal-coder` directory and write/update an `implementation_plan.md` locally.
  - **Acceptance Criteria**:
    - New tool `GENERATE_PLAN` initializes the local lifecycle for a task.

- **[x] User Story 9.2: Directory & Architecture Discovery Tool**
  - **As an** agent (Architect),
  - **I need** a tool that can map out the entire project's architecture and identify key entry points.
  - **Acceptance Criteria**:
    - New tool `ARCHITECTURE_MAP` provides a recursive summary of exports/imports and file dependencies.

- **[x] User Story 9.3: Batch File Analysis & Scrutiny Tool**
  - **As an** agent (Developer),
  - **I need** a tool that can summarize multiple files simultaneously for context-aware coding.
  - **Acceptance Criteria**:
    - New tool `BATCH_READ` compresses multi-file context for LLM memory.

- **[x] User Story 9.4: Security & Performance Auditor Tools**
  - **As an** auditor agent,
  - **I need** specialized pattern-matching tools to identify vulnerabilities and bottlenecks.

- **[x] User Story 9.5: Advanced Terminal Stream Interceptor**
  - **As a** monitoring agent,
  - **I need** to monitor background tasks for specific success/failure patterns in real-time.

---

## Phase 6: Multi-Agent Orchestration & Workflow (The Orchestration Phase)

### Epic 10: The Planning vs. Implementation Checkpoint

- **[x] User Story 10.1: Mode-Based Execution Handshake**
  - **As a** user,
  - **I want** the agent to stop entirely after creating the local `implementation_plan.md`
  - **So that** I have a single point of approval before the execution crew starts coding.
  - **Acceptance Criteria**:
    - The `AgentLoop` recognizes the "Planning Finished" state.
    - Implementation Mode (Coding/Testing) is hard-locked until the local plan is "Marked as Approved" in the UI.

### Epic 11: State Graph Orchestrator (The "Brain")

- **[ ] User Story 11.1: Node-Based Task Flow Execution**
  - **As the** extension host,
  - **I want** to manage task transitions between agents using a state-graph logic (e.g., Planning -> Review -> Implementation -> QA).
  - **Acceptance Criteria**:
    - A `CrewOrchestrator` service handles the handoff logic based on tool outputs.

### Epic 12: Real-Time Multi-Agent UI Visualization

- **[x] User Story 12.1: Live Crew Member Status Tracker** _(stage banner + activity timeline + trace log)_
  - **As a** user,
  - **I want to** see which specific agent is currently "In the loop" via the Webview UI.
  - **Acceptance Criteria**:
    - The UI dynamically updates with agent-specific avatars and statuses (e.g., "🏗️ Planning Architect is Designing...").
