# 🛠️ Lokal Coder Agent

> **Premium AI Agent Studio for VS Code**

Lokal Coder is a high-fidelity agentic workspace designed for high-performance task execution, architectural planning, and real-time code generation powered by **Llama 3.1** and **Ollama**.

---

## ✨ Key Features

- **🏗️ Agentic Orchestration** — Multi-agent workflows (Architect, Developer, QA) that handle complex tasks from planning to verification.
- **🎨 Elite UI/UX** — Modern, responsive chat interface inspired by Vercel and premium AI studios.
- **🐚 Terminal Deep-Link** — Background command execution with real-time mirroring and safety blocks.
- **⚡ Fast Plan Mode** — Immediate implementation strategies and code explanations for rapid prototyping.
- **💾 Chat Persistence** — Secure, user-scoped conversation history powered by Supabase.

## 🚀 Getting Started

### 1. Build the Extension

```bash
pnpm install
pnpm run vsix
```

### 2. Install Locally

Install the generated `.vsix` file into your preferred editor:

- **VS Code**: `code --install-extension lokal-coder.vsix`
- **Antigravity**: `antigravity --install-extension lokal-coder.vsix`
- **Cursor**: `cursor --install-extension lokal-coder.vsix`

### 3. Usage

1. **Open** the "Lokal Coder" view in the Explorer sidebar.
2. **Configure** your `apiBaseUrl` (defaults to Ollama) in settings.

## 🛡️ Security

Lokal Coder prioritizes local-first execution. Your code stays in your workspace. Integration with Supabase is optional and used only for encrypted chat persistence if configured.

## 📄 Versioning & Releases

Lokal Coder follows **Semantic Versioning** (`vMajor.Minor.Patch`). Every merge to the `main` branch triggers an automated release based on your commit messages.

### How to Trigger Releases

Our CI/CD pipeline uses the following commit prefixes to determine the next version:

- **Major Release** (`v2.0.0`) — Triggered by `feat!:` or `BREAKING CHANGE:` in the commit message.
  - _Example_: `feat!: redesign core agent loop`
- **Minor Release** (`v1.1.0`) — Triggered by `feat:` in the commit message.
  - _Example_: `feat: add new specialized agent for refactoring`
- **Patch Release** (`v1.0.1`) — Triggered by `fix:` in the commit message.
  - _Example_: `fix: resolve crash in terminal service`

### Downloading Releases

You can find all official versions, along with their generated changelogs and `.vsix` binaries, on our [Releases](https://github.com/lokal-coder/vs-code-agent/releases) page.

## 📄 Open Source & Contributions

Lokal Coder is proudly **Open Source** under the [MIT License](LICENSE.txt). We welcome contributions from the community!

- **Found a bug?** Open an issue.
- **Have a feature idea?** Submit a PR.
- **Want to help?** Check out the `CONTRIBUTING.md` (coming soon).

---

© 2026 Rishabh Tiwari  
_Built for the community, by the community._
