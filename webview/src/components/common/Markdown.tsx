import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";

SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("css", css);

import { Copy, Check, Terminal } from "lucide-react";

function CodeBlock({ _node, inline, className, children, ...props }: any) {
  const match = /language-(\w+)/.exec(className || "");
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ""));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return !inline && match ? (
    <div className="relative group/code my-3 rounded-xl overflow-hidden border border-[var(--chat-composer-border)] bg-[var(--vscode-editor-background,#1e1e1e)] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[rgba(0,0,0,0.25)] border-b border-[var(--chat-composer-border)]">
        <div className="flex items-center gap-2 opacity-50 uppercase tracking-widest text-[9px] font-bold">
          <Terminal size={10} />
          <span>{match[1]}</span>
        </div>
        <button
          onClick={handleCopy}
          className="p-1 rounded hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
        >
          {isCopied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
        </button>
      </div>

      {/* Code */}
      <div className="overflow-x-auto max-w-full">
        <SyntaxHighlighter
          {...props}
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: "0.75rem 0.5rem",
            fontSize: "12px",
            backgroundColor: "transparent",
            minWidth: "max-content",
          }}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    </div>
  ) : (
    <code
      className="px-1.5 py-0.5 rounded-md bg-[var(--vscode-textCodeBlock-background,rgba(255,255,255,0.06))] border border-[var(--chat-composer-border)] text-[12px] font-mono text-[var(--vscode-textPreformat-foreground,#a5b4fc)]"
      {...props}
    >
      {children}
    </code>
  );
}

interface MarkdownProps {
  content: string;
}

export function Markdown({ content }: MarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code: CodeBlock,
        table({ children }) {
          return (
            <div className="overflow-x-auto my-4 rounded-lg border border-white/10">
              <table className="w-full text-left text-[12px] border-collapse">{children}</table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-white/5 font-bold">{children}</thead>;
        },
        th({ children }) {
          return (
            <th className="p-2 border-b border-white/10 text-slate-400 uppercase tracking-tighter text-[10px]">
              {children}
            </th>
          );
        },
        td({ children }) {
          return <td className="p-2 border-b border-white/5 text-slate-300">{children}</td>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="pl-4 py-1 my-3 border-l-2 border-indigo-500/50 bg-indigo-500/5 italic text-slate-400">
              {children}
            </blockquote>
          );
        },
        p({ children }) {
          return (
            <p
              className="mb-3 last:mb-0 leading-[1.65] text-[13px]"
              style={{ color: "var(--text-primary)" }}
            >
              {children}
            </p>
          );
        },
        ul({ children }) {
          return (
            <ul
              className="list-disc list-outside ml-4 mb-4 space-y-1.5 text-[13px]"
              style={{ color: "var(--text-primary)" }}
            >
              {children}
            </ul>
          );
        },
        ol({ children }) {
          return (
            <ol
              className="list-decimal list-outside ml-4 mb-4 space-y-1.5 text-[13px]"
              style={{ color: "var(--text-primary)" }}
            >
              {children}
            </ol>
          );
        },
        li({ children }) {
          return <li className="leading-relaxed pl-0.5">{children}</li>;
        },
        h1({ children }) {
          return (
            <h1
              className="text-lg font-semibold mt-6 mb-2 tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {children}
            </h1>
          );
        },
        h2({ children }) {
          return (
            <h2
              className="text-[15px] font-semibold mt-5 mb-2 tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {children}
            </h2>
          );
        },
        h3({ children }) {
          return (
            <h3
              className="text-[14px] font-semibold mt-4 mb-1.5"
              style={{ color: "var(--text-primary)" }}
            >
              {children}
            </h3>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
