# Lokal Coder Agent: Technical Requirements Document (TRD)

> **Document Purpose:** This document serves as the foundational technical schema and requirement manifest for the Lokal Coder Agent. It is designed to be ingested by subsequent LLM agents to perfectly understand the architectural patterns, security bounds, user flow, and structural constraints required to build and maintain the extension.

---

## 🏗️ 1. Architectural Foundation & Design Patterns

To guarantee high maintainability, testability, and scalability, the extension MUST be built using a **Service-Oriented Architecture (SOA)** and explicitly separate UI logic from Extension Host capabilities.

### 1.1 Core Design Patterns

1. **Dependency Injection (DI) / Service Locator:**
   - Establish a central registry managing singleton services (e.g., `TerminalService`, `FileSystemService`, `AIService`).
   - **Reasoning:** Ensures VS Code API boundaries are abstract and mockable for unit testing.
2. **Mediator Pattern (Message Routing):**
   - The Webview (React/Vue frontend) and the Extension Host (Node.js backend) must never be tightly coupled.
   - **Reasoning:** Communication relies entirely on serializable message payloads passing through a central `Message Router`.
3. **Command Pattern:**
   - Every state-mutating action executed by the AI (file creation, terminal execution, refactoring) MUST subclass a discrete `Command` object.
   - **Reasoning:** Guarantees strict tracking of actions, allowing for an implicit `execute()` and `undo()` history pipeline.

### 1.2 Folder Structure Constraints

- `/webview`: Dedicated directory for the frontend React/Vue application.
- `/src/core`: Houses the DI container, foundational type definitions, and interfaces.
- `/src/services`: Isolated logic modules handling specific VS Code APIs (`Terminal`, `Workspace`, `API`).
- `/src/commands`: Executable actions capable of being triggered by the frontend or AI loop.

---

## 🔄 2. UI & State Configuration (The Dual-Mode Interface)

The agent operates strictly on defined cognitive intents to guarantee user predictability.

### 2.1 The Mode Selection UI

The Webview Chat UI must contain a persistent intent dropdown or toggle containing three states:

1. `🧠 Plan Strategy` _(Default)_: Instructs the backend to only generate a step-by-step markdown plan.
2. `⚡ Agent Execute`: Instructs the backend to directly generate executable commands and apply code diffs.
3. `💬 Ask`: Bypasses execution schemas entirely for standard conversational Q&A.

**Payload Schema:**

```json
{
  "command": "SUBMIT_PROMPT",
  "data": {
    "mode": "PLAN | AGENT | ASK",
    "prompt": "Refactor this component...",
    "activeFile": "/src/components/Button.tsx",
    "selectedLines": [12, 45]
  }
}
```

### 2.2 The Handoff Workflow (Plan -> Agent)

When the backend returns a `Plan`, the UI renders it as an interactive Markdown list. A dynamic `[ Execute This Plan ]` button must be injected below the response. Clicking this securely bypasses the dropdown, repacking the prompt with `mode: "AGENT"` for immediate background execution.

---

## 🚦 3. Extension Configuration & API Routing

### 3.1 User Configuration (package.json)

The extension must export the following configuration settings so that backend targets are modular:

- `lokal-coder.apiBaseUrl`: Top-level API domain (e.g., `http://localhost:3000`).
- `lokal-coder.agentEndpoint`: Execution API path (Default: `/api/v1/agent`).
- `lokal-coder.planningEndpoint`: Strategy API path (Default: `/api/v1/plan`).
- `lokal-coder.apiKey`: Secure authentication token storage.

### 3.2 Traffic Cop Routing

The `Message Router` processes the payload `mode` attribute:

- **`mode === 'PLAN'`**: Routes to `planningEndpoint`. System Prompt: _"You are a Senior Architect. Do NOT write code. Write a strict implementation plan."_
- **`mode === 'AGENT'`**: Routes to `agentEndpoint`. System Prompt: _"You are a 10x Developer. Execute exact steps. Return ONLY executable command schemas."_

---

## 🗂️ 4. Code Generation & Workspace Access Engine

### 4.1 Context Gathering (Read Access)

- **Active Context:** Service listens to VS Code window focus events to continuously package the active file, language ID, and highlighted text selections.
- **Diagnostic Context:** Automatically scrape the active editor's diagnostic collection to capture errors/warnings dynamically.
- **Workspace Map:** Index the top-level directory structure (safely ignoring `.git` and `node_modules`) to formulate an architectural tree for the LLM.

### 4.2 The Diff & Patch System (Write Access)

- **Virtual Document Processing:** `FileSystemService` translates AI Unified Diffs into the native `WorkspaceEdit` API.
- **Diff View Checkpoint (Security Constraint):** Never overwrite user code silently. Automatically force open the native VS Code Diff Editor comparing the local file with the AI's virtual patch. The user MUST explicitly click "Accept" to apply the change.
- **Batch Scaffolding:** For massive insertions, the AI produces a JSON array of paths and contents to batch-write recursively to disk.

---

## 💻 5. Sandbox Terminal Engine

Terminal access enables autonomous CI loops, but requires robust boundary security.

### 5.1 Dual-Execution Strategy

1. **Background Execution (`child_process`):** Hidden Node.js processes handle AI execution requests safely, allowing the application to neatly collect `stdout` and `stderr` to funnel directly back to the active LLM context.
2. **Foreground Mirroring (Pseudoterminal):** As background processes resolve, their streams MUST be piped to a custom, read-only VS Code Pseudoterminal titled "Lokal Coder Console" for complete user transparency.

### 5.2 Destructive Action Guardrails

- **Action Whitelisting:** `TerminalService` maintains an approved index of safe commands (e.g., `npm run lint`, `tsc`, `git status`).
- **Explicit Consent Hard Blocks:** Any out-of-bounds command (e.g., `rm -rf`) throws a hard halt. A VS Code modal pops up stating: _"The AI wants to execute [command]. Allow?"_

---

## 🤖 6. The Autonomous Agentic Setup Loop

To achieve reliable autonomy, the extension relies on automated diagnostic verification to drive a multi-step completion loop.

### 6.1 The Action Router

The execution payload handles predefined action schemas rigorously:

- `action_type === 'FILE_CREATE'` ➜ `FileSystemService.createFile()`
- `action_type === 'FILE_EDIT'` ➜ `WorkspaceService.applyDiff()` (Opens Diff View)
- `action_type === 'TERMINAL_RUN'` ➜ `TerminalService.runCommand()`

### 6.2 Agentic Feedback Flow

1. **Trigger:** User provides code and triggers `mode: AGENT`.
2. **Action Execution:** The AI produces a payload executing Step 1.
3. **Auto-Verification:** The extension executes Step 1, waits briefly (`onDidSaveTextDocument` / Terminal Exit Code), and aggressively reads the VS Code Error Diagnostics.
4. **Correction Loop:** If linter errors or `stderr` crashes exist, the backend sends an automated background payload containing the error footprint directly back to the `agentEndpoint` to patch the mistake.
5. **Success Progression:** If no errors are discovered, the extension silently pings the `agentEndpoint` with: _"Step 1 complete. Proceed to Step 2."_ This cycles until completion.

---

> **End of Requirements Document.**  
> _Note to consuming AI Agents: Adhere strictly to these architectural bounds and user protection models when proposing or implementing codebase modifications._
