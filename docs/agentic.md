# 🧠 FULL LOKAL AGENT ARCHITECTURE (LangGraph + CrewAI)

This document defines the production-grade, stateful, multi-agent layered architecture for Lokal Agent. It utilizes **LangGraph** for deterministic, stateful execution routing and **CrewAI** for specialized multi-agent reasoning.

---

## 🧩 1. User Use Cases (UC)

We break down the system based on what the user wants to achieve:

| UC #    | Use Case                 | Description                                    | Output                                           |
| :------ | :----------------------- | :--------------------------------------------- | :----------------------------------------------- |
| **UC1** | Plan a coding task       | User describes a requirement (new feature/fix) | `plan.md`, `implementation.md`                   |
| **UC2** | Analyze existing project | Scan folders, files, entry points, tech stack  | `summary.md`                                     |
| **UC3** | Execute code changes     | Implement the plan safely                      | Files updated, terminal commands executed        |
| **UC4** | Validate changes         | Run tests/build                                | Success/failure, error logs                      |
| **UC5** | Auto-fix errors          | Retry until build/tests pass                   | Corrected files, verified changes                |
| **UC6** | Normal chat              | User asks non-coding questions                 | Chat response                                    |
| **UC7** | Multi-agent reasoning    | Complex planning/review loops                  | Structured task decomposition, reviewer feedback |

---

## 🤖 2. Agents Needed & Responsibilities

Agents are assigned specific roles and tools. Some are pure LangGraph nodes, while reasoning-heavy tasks utilize CrewAI.

| Agent                  | Responsibility           | Tools                              | Notes                                                            |
| :--------------------- | :----------------------- | :--------------------------------- | :--------------------------------------------------------------- |
| **Conversation Agent** | Handle UC6 (normal chat) | LLM, Memory, File Reader           | Filters conversation vs coding intent. Can read requested files. |
| **Planner Agent**      | UC1, UC7                 | LLM / CrewAI                       | Generates `plan.md` & `implementation.md`                        |
| **Codebase Analyzer**  | UC2                      | File/Dir tools, Embeddings         | Creates `summary.md`                                             |
| **Task Decomposer**    | UC7                      | LLM (Structured Output)            | Breaks plan → atomic steps, dependencies                         |
| **Executor Agent**     | UC3                      | File/Dir tools, Rust CLI, Terminal | Performs steps safely, snapshots files                           |
| **Validator Agent**    | UC4                      | Terminal runner, LLM               | Runs build/tests, parses logs                                    |
| **Fix Loop Agent**     | UC5                      | Diff generator, Revert system, LLM | Retry loop until success                                         |
| **Reviewer Agent**     | UC7                      | CrewAI (optional)                  | Checks correctness, suggests improvements                        |
| **Final Output Agent** | All                      | Formatter, LLM                     | Summarizes results for user                                      |

---

## ⚡ 3. How LangGraph Orchestrates These Agents

LangGraph acts as the stateful engine controlling flow, dependencies, and retries.

**Key Insight:** LangGraph = Deterministic flow, state, retries, execution. CrewAI = Multi-agent reasoning, planning, review.

### 🔹 Node Structure

```text
[User Input Node] → [Intent Router Node]
        ↓
[Conversation Node] ─(if normal chat)→ Output
        ↓
[Planner Node] → [Codebase Analyzer Node] → [Task Decomposer Node]
        ↓
[Executor Node] → [Validator Node] → [Fix Loop Node]
        ↓
[Reviewer Node (optional)] → [Final Output Node]
```

### 🔹 Edge Logic & Deterministic Flow

Edges define deterministic routing:

- `Planner` → `Analyzer` → `Decomposer` → `Executor`
- `Executor` → `Validator` → `Fix Loop` → `Validator` (Loop until pass or max retries)
- `Reviewer` → can cycle back to modify `Decomposer` or `Planner` if CrewAI flags issues.

### 🔹 Key Features of LangGraph Integration

- **Deterministic Execution:** Maintains global state (messages, intention, plans, tasks).
- **Environment Tracking:** Tracks which files are modified and terminal commands executed.
- **Loop Control (Fix Loop):** Safely retries failed tasks, applying snapshots + reverts as needed.
- **Agent Integration:** Each agent acts as a node. Nodes can trigger tools (File system, Directory manager, Terminal runner, Embeddings).

---

## 🤝 4. CrewAI Role (Multi-Agent Reasoning)

CrewAI adds deep multi-agent collaborative reasoning on top of LangGraph’s deterministic flow:

- **Planner Node:** Uses a Crew of specialized LLMs (Architect, Senior Dev) to generate complex software plans.
- **Reviewer Node:** Uses a Crew to inspect task decomposition and executed code against organizational standards.
  This provides the illusion of an expert team while LangGraph maintains strict pipeline control.

---

## 🔄 5. Phase-Wise Flow & Detailed Layers

### 🔹 LAYER 0: Conversation & Intent Gateway (Phase 1)

_This is the frontline node connecting user input to either direct answers or deep agentic pipelines._

**🎯 Purpose**
Serve as the stateful entry point. It answers direct questions, provides file-specific context, and decides if the command is purely conversational (UC6) or requires actionable modifications.

**🧠 Responsibilities**

- Answer general questions using conversation memory.
- Read specific files if the user asks questions about their contents (_"read the file and answer on top of that"_).
- Ask follow-up clarifying questions for vague prompts.
- Route coding tasks to the broader pipeline via the Intent Router.

**🧰 Tools & Integrations**

- **LangGraph Node:** `conversation_node`
- **Tool: File Reader (`read_file`):** CRITICAL for Layer 0. Allows the conversational agent to read a file from the workspace to answer user questions contextually without triggering the full task execution engine.
- **Tool: Memory Access:** Short-term SQLite/Redis conversational state buffers.
- **Tool: Semantic Intent Router:** Zero-shot classification to route to `CODE_CHANGE`, `PLANNING`, or complete at Conversation.

**🔀 Output to State**

- `intent_type`: `CONVERSATION` | `ACTIONABLE_TASK`
- Output response (if purely conversation).

---

### 🔹 LAYER 1: Planning & Analysis (Phase 2)

_(Combines Planner Agent and Codebase Analyzer)_

**🎯 Purpose**
Create an architectural plan and deeply understand the existing codebase before modifying anything.

**Tools & Integrations:**

- **CrewAI Sub-system:** `ArchitectAgent` and `ReviewerAgent` for robust collaboration.
- **File/Dir Scanners & Embeddings:** Analyzes the existing state mapping into `summary.md`.

---

### 🔹 LAYER 2: Task Decomposition (Phase 3)

_(Task Decomposer Agent)_

**🎯 Purpose**
Convert the CrewAI plan into atomic, strictly ordered JSON steps for LangGraph to execute.

**Tools & Integrations:**

- **Structured LLM Output:** Forces JSON payload containing `action`, `file`, `dependencies`.

---

### 🔹 LAYER 3: Execution Engine (Phase 4)

_(Executor Agent)_

**🎯 Purpose**
Apply file modifications safely and execute terminal commands one by one.

**Tools & Integrations:**

- **File Editor/Writer / Regex Tools.**
- **Terminal Run Tool:** Executes local bash/Rust CLI commands.
- **Snapshot Config Tool:** Snapshots environment to Git beforehand.

---

### 🔹 LAYER 4: Validation (Phase 5)

_(Validator Agent)_

**🎯 Purpose**
Verify changes didn't break functionality.

**Tools & Integrations:**

- **Terminal Runner:** Runs `npm run build` / `cargo test`.
- **Log Parser Tool:** Extracts stack traces from stderr.

---

### 🔹 LAYER 5: Fix Loop Factory (Phase 6)

_(Fix Loop Agent)_

**🎯 Purpose**
Retry the operation autonomously if Validation fails.

**Tools & Integrations:**

- **Rollback Tool:** Reverts back to Phase 4 snapshot.
- **Diff Generator Tool.**

---

### 🔹 LAYER 6: Review & Final Output (Phase 7)

_(Reviewer Agent & Final Output Agent)_

**🎯 Purpose**
CrewAI review cycle for code quality, and formatting final Markdown outputs to the user.

**Tools & Integrations:**

- **CrewAI Reviewer Node.**
- **Markdown Response Formatter.**
