# Lokal Agent Features & Implementation (Layered Architecture)

This document defines the structured Epics, User Stories, and formal Acceptance Criteria essential for building the Lokal Agent. These features are perfectly mapped to the LangGraph + CrewAI layered architecture defined in `docs/agentic.md`.

---

## 🔹 LAYER 0: Conversation & Intent Gateway

### Epic 0: Layer 0 Foundation & Conversational Orchestration

**Overview:**
This Epic focuses on establishing the frontline node of LangGraph. Layer 0 is responsible for maintaining stateful conversations, remembering context, reading user-specified files, and routing intents correctly.

- **User Story 0.0: Memory Integration & SQLite Persistence**
  - **As a** user,
  - **I want** the gateway agent to remember our conversation history sequentially across multiple prompt turns
  - **So that** I do not have to repeat context, and the bot acts as a continuous dialogue partner.
  - **Acceptance Criteria**:
    - A local SQLite database (or equivalent key-value store) is instantiated to store the LangGraph `messages` node state natively.
    - The `conversation_node` correctly initializes, retrieves history, and appends the latest user/assistant payloads to this short-term memory buffer on every turn.
  - **Required Tools & Components**:
    - `Memory Buffer / SQLite Tool`
    - `LangGraph Node: conversation_node`

- **User Story 0.1: Contextual File Reading & Intent Routing**
  - **As a** user,
  - **I want** to ask questions about specific files in my workspace and get immediate answers without modifying the codebase
  - **So that** the agent provides context-aware conversational answers and only triggers deeper execution phases when I explicitly ask for code changes.
  - **Acceptance Criteria**:
    - The conversation agent is explicitly scoped with the `read_file` tool to ingest file content gracefully.
    - The conversational engine utilizes an integrated Semantic Intent Router to analyze the query.
    - If the prompt is conversational (e.g., "Explain what auth.ts does"), it routes to `CONVERSATION` and outputs to the user.
    - If actionable ("Refactor auth.ts"), it outputs `ACTIONABLE_TASK` and passes state downstream.
  - **Required Tools & Components**:
    - `File Reader Tool (read_file)`
    - `Semantic Intent Router Tool (Zero-shot/LLM classifier)`
    - `LLM/Chat Model (Core reasoning tool)`

---

## 🔹 LAYER 1: Intent Routing & Planning Layer (To Be Detailed)

_(Details pending for subsequent phases...)_

## 🔹 LAYER 2: Codebase Intelligence Layer (To Be Detailed)

_(Details pending for subsequent phases...)_

## 🔹 LAYER 3: Task Decomposition Layer (To Be Detailed)

_(Details pending for subsequent phases...)_

## 🔹 LAYER 4: Execution Layer (To Be Detailed)

_(Details pending for subsequent phases...)_

## 🔹 LAYER 5: Validation Layer (To Be Detailed)

_(Details pending for subsequent phases...)_

## 🔹 LAYER 6: Fix Loop Engine (To Be Detailed)

_(Details pending for subsequent phases...)_

## 🔹 LAYER 7: Final Output Layer (To Be Detailed)

_(Details pending for subsequent phases...)_
