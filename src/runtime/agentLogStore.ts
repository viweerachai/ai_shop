import { createId } from "../utils/ids.js";
import { nowIso } from "../utils/date.js";

export type AgentLogStatus = "success" | "failed";

export interface AgentLogEntry {
  logId: string;
  promptName: string;
  status: AgentLogStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  inputPreview: string;
  promptPreview: string;
  responsePreview: string;
  prompt: string;
  response: string;
  input: unknown;
  result?: unknown;
  error?: string;
}

const PREVIEW_LIMIT = 280;
const STORE_LIMIT = 200;

function preview(value: string): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length <= PREVIEW_LIMIT ? cleaned : `${cleaned.slice(0, PREVIEW_LIMIT)}…`;
}

class AgentLogStore {
  private readonly entries: AgentLogEntry[] = [];

  record(entry: {
    promptName: string;
    status: AgentLogStatus;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    prompt: string;
    response: string;
    input: unknown;
    result?: unknown;
    error?: string;
  }): AgentLogEntry {
    const inputText = (() => {
      try {
        return typeof entry.input === "string" ? entry.input : JSON.stringify(entry.input);
      } catch {
        return String(entry.input ?? "");
      }
    })();
    const stored: AgentLogEntry = {
      logId: createId("log"),
      promptName: entry.promptName,
      status: entry.status,
      startedAt: entry.startedAt,
      finishedAt: entry.finishedAt,
      durationMs: entry.durationMs,
      inputPreview: preview(inputText),
      promptPreview: preview(entry.prompt),
      responsePreview: preview(entry.response),
      prompt: entry.prompt,
      response: entry.response,
      input: entry.input,
      result: entry.result,
      error: entry.error
    };
    this.entries.unshift(stored);
    this.entries.splice(STORE_LIMIT);
    return stored;
  }

  list(filter?: { promptName?: string; status?: AgentLogStatus; limit?: number }): AgentLogEntry[] {
    const limit = filter?.limit ?? 50;
    return this.entries
      .filter((entry) =>
        (!filter?.promptName || entry.promptName === filter.promptName) &&
        (!filter?.status || entry.status === filter.status)
      )
      .slice(0, limit);
  }

  find(logId: string): AgentLogEntry | undefined {
    return this.entries.find((entry) => entry.logId === logId);
  }

  count(): number {
    return this.entries.length;
  }
}

export const agentLogStore = new AgentLogStore();
export const agentLogTimestamp = nowIso;
