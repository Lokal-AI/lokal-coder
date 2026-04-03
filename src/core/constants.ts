/**
 * Global Configuration Constants for the Lokal Coder Multi-Agent Crew.
 */
export const MAX_AGENT_RETRIES = 3;
export const MAX_AGENT_TURNS = 10;
export const LOKAL_CODER_DIR = ".lokal-coder";
export const LOKAL_PLAN_FILE = "implementation_plan.md";

export const DANGEROUS_PATTERNS = [
  /\brm\s+-rf\b/i,
  /\brm\s+.+\s+-rf\b/i,
  /\brm\s+-f\b/i,
  /\brm\b.*\/\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+clean\s+-fd\b/i,
  /\bsudo\b/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bmkfs\b/i,
  /\bdd\b.*of=\/dev\//i,
  />\s*\/dev\//i,
];
