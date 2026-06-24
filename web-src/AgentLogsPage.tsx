import {
  AlertTriangle,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Filter,
  RefreshCw,
  Search,
  Sparkles,
  User,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "./apiClient";

type LogStatus = "success" | "failed";

type LogSummary = {
  logId: string;
  promptName: string;
  status: LogStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  inputPreview: string;
  promptPreview: string;
  responsePreview: string;
  error?: string;
};

type LogDetail = LogSummary & {
  prompt: string;
  response: string;
  input: unknown;
  result?: unknown;
};

type LogListResponse = {
  total: number;
  entries: LogSummary[];
};

const REFRESH_INTERVAL_MS = 5000;

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatTime(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("th-TH", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Tokyo"
  });
}

function safeStringify(value: unknown): string {
  if (value === undefined) return "—";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function AgentLogsPage({ onMessage }: { onMessage: (message: string) => void }) {
  const [data, setData] = useState<LogListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LogStatus>("all");
  const [promptFilter, setPromptFilter] = useState("all");
  const [selected, setSelected] = useState<LogDetail | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (promptFilter !== "all") params.set("promptName", promptFilter);
      const response = await apiFetch(`/api/agent-logs?${params.toString()}`);
      if (!response.ok) throw new Error("โหลด log ไม่สำเร็จ");
      setData(await response.json());
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, promptFilter, onMessage]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(load, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [autoRefresh, load]);

  const filtered = useMemo(() => {
    const entries = data?.entries ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter((entry) =>
      entry.promptName.toLowerCase().includes(term) ||
      entry.inputPreview.toLowerCase().includes(term) ||
      entry.responsePreview.toLowerCase().includes(term)
    );
  }, [data, search]);

  const promptOptions = useMemo(() => {
    const set = new Set((data?.entries ?? []).map((entry) => entry.promptName));
    return ["all", ...[...set].sort()];
  }, [data]);

  async function openDetail(logId: string) {
    try {
      const response = await apiFetch(`/api/agent-logs/${logId}`);
      if (!response.ok) throw new Error("โหลดรายละเอียด log ไม่สำเร็จ");
      const detail: LogDetail = await response.json();
      setSelected(detail);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    }
  }

  if (loading && !data) {
    return <div className="panel products-loading"><RefreshCw className="spin" /> กำลังโหลด AI Conversations...</div>;
  }

  return (
    <div className="agent-logs-page">
      <div className="panel agent-logs-summary">
        <div>
          <strong>{data?.total ?? 0}</strong>
          <span>บทสนทนาทั้งหมด (เก็บ 200 ล่าสุด)</span>
        </div>
        <div>
          <strong>{(data?.entries ?? []).filter((entry) => entry.status === "success").length}</strong>
          <span>สำเร็จในรอบที่แสดง</span>
        </div>
        <div>
          <strong>{(data?.entries ?? []).filter((entry) => entry.status === "failed").length}</strong>
          <span>ล้มเหลวในรอบที่แสดง</span>
        </div>
        <button
          type="button"
          className={`secondary-action ${autoRefresh ? "is-on" : ""}`}
          onClick={() => setAutoRefresh((value) => !value)}
        >
          <RefreshCw size={14} className={autoRefresh ? "spin" : ""} />
          {autoRefresh ? "กำลัง refresh ทุก 5 วินาที" : "หยุด auto-refresh"}
        </button>
      </div>

      <div className="panel agent-logs-toolbar">
        <div className="product-search">
          <Search size={17} />
          <input
            aria-label="ค้นหา log"
            placeholder="ค้นหา prompt, input หรือ response"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <label className="filter-control">
          <Filter size={15} />
          <select
            aria-label="กรองตาม prompt"
            value={promptFilter}
            onChange={(event) => setPromptFilter(event.target.value)}
          >
            {promptOptions.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "ทุก agent" : option}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-control">
          <Filter size={15} />
          <select
            aria-label="กรองตามสถานะ"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | LogStatus)}
          >
            <option value="all">ทุกสถานะ</option>
            <option value="success">สำเร็จ</option>
            <option value="failed">ล้มเหลว</option>
          </select>
        </label>
      </div>

      <div className="panel agent-logs-list">
        {filtered.length === 0 && (
          <div className="empty-state">
            ยังไม่มี log ในรอบนี้ — ลอง รัน workflow สักรอบหนึ่ง (กดปุ่มรันทันทีล่างขวา)
          </div>
        )}
        {filtered.map((entry) => (
          <button
            key={entry.logId}
            type="button"
            className={`agent-log-row status-${entry.status}`}
            onClick={() => openDetail(entry.logId)}
          >
            <span className="agent-log-icon">
              {entry.status === "success" ? <Bot size={18} /> : <AlertTriangle size={18} />}
            </span>
            <div className="agent-log-body">
              <div className="agent-log-head">
                <strong>{entry.promptName}</strong>
                <span className={`agent-log-status status-${entry.status}`}>
                  {entry.status === "success" ? <Check size={12} /> : <AlertTriangle size={12} />}
                  {entry.status === "success" ? "สำเร็จ" : "ล้มเหลว"}
                </span>
              </div>
              <small className="agent-log-meta">
                <Clock3 size={12} />{formatTime(entry.startedAt)} · {formatDuration(entry.durationMs)}
              </small>
              <p className="agent-log-preview">
                {entry.error ? `Error: ${entry.error}` : entry.responsePreview || entry.promptPreview}
              </p>
            </div>
            <ChevronRight size={16} className="agent-log-chevron" />
          </button>
        ))}
      </div>

      {selected && <AgentLogDetail entry={selected} onClose={() => setSelected(null)} onMessage={onMessage} />}
    </div>
  );
}

function splitPrompt(prompt: string): { systemPart: string; inputPart: string } {
  const inputIndex = prompt.indexOf("INPUT:\n");
  if (inputIndex < 0) return { systemPart: prompt, inputPart: "" };
  return {
    systemPart: prompt.slice(0, inputIndex).trim(),
    inputPart: prompt.slice(inputIndex + "INPUT:\n".length).trim()
  };
}

function AgentLogDetail({
  entry,
  onClose,
  onMessage
}: {
  entry: LogDetail;
  onClose: () => void;
  onMessage: (message: string) => void;
}) {
  const { systemPart, inputPart } = splitPrompt(entry.prompt);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      onMessage("คัดลอกแล้ว");
    } catch {
      onMessage("คัดลอกไม่สำเร็จ");
    }
  }

  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <aside className="content-drawer agent-log-drawer" aria-label="รายละเอียด AI conversation">
        <div className="drawer-head">
          <div>
            <span className="eyebrow">AI CONVERSATION</span>
            <h2>{entry.promptName}</h2>
            <p>{formatTime(entry.startedAt)} · {formatDuration(entry.durationMs)}</p>
          </div>
          <button aria-label="ปิด" onClick={onClose}><X /></button>
        </div>
        <div className="content-drawer-status">
          <span className={`agent-log-status status-${entry.status}`}>
            {entry.status === "success" ? "สำเร็จ" : "ล้มเหลว"}
          </span>
          {entry.error && <span className="risk-badge risk-high">{entry.error}</span>}
        </div>

        <div className="agent-chat">
          <ChatBubble
            role="system"
            label="System rules + business prompt"
            time={formatTime(entry.startedAt)}
            body={systemPart}
            onCopy={() => copy(systemPart)}
          />
          <ChatBubble
            role="user"
            label="Input from workflow"
            time={formatTime(entry.startedAt)}
            body={inputPart || safeStringify(entry.input)}
            onCopy={() => copy(inputPart || safeStringify(entry.input))}
          />
          {entry.error ? (
            <ChatBubble
              role="error"
              label={`${entry.promptName} (failed)`}
              time={formatTime(entry.finishedAt)}
              body={entry.error}
              onCopy={() => copy(entry.error ?? "")}
            />
          ) : (
            <ChatBubble
              role="assistant"
              label={`${entry.promptName} response`}
              time={formatTime(entry.finishedAt)}
              body={entry.response || "— ไม่มี response —"}
              onCopy={() => copy(entry.response)}
            />
          )}
        </div>
      </aside>
    </div>
  );
}

function ChatBubble({
  role,
  label,
  time,
  body,
  onCopy
}: {
  role: "system" | "user" | "assistant" | "error";
  label: string;
  time: string;
  body: string;
  onCopy: () => void;
}) {
  const Icon = role === "assistant" ? Bot : role === "error" ? AlertTriangle : role === "system" ? Sparkles : User;
  return (
    <div className={`chat-bubble role-${role}`}>
      <div className="chat-avatar"><Icon size={16} /></div>
      <div className="chat-bubble-body">
        <div className="chat-bubble-head">
          <strong>{label}</strong>
          <span>{time}</span>
          <button type="button" className="chat-bubble-copy" onClick={onCopy} aria-label="คัดลอก">
            <Copy size={13} />
          </button>
        </div>
        <pre>{body}</pre>
      </div>
    </div>
  );
}
