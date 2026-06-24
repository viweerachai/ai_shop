import { Bot, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "./apiClient";

type CeoChatAction = {
  id: string;
  title: string;
  owner: "CEO" | "Marketing" | "Manager" | "Owner";
  priority: "high" | "medium" | "low";
  status: "ready" | "in_progress" | "completed" | "watch" | "blocked";
  reason: string;
  source: "sales" | "content" | "promotion" | "operations";
  sku?: string;
};

type CeoChatResponse = {
  answer: string;
  confidence: "low" | "medium" | "high";
  dataGaps: string[];
  proposedActions: CeoChatAction[];
  ruleSuggestion: string;
  appliedActionIds: string[];
};

type Message = {
  id: string;
  role: "user" | "ai";
  text: string;
  actions?: CeoChatAction[];
  dataGaps?: string[];
  ruleSuggestion?: string;
  confidence?: CeoChatResponse["confidence"];
};

const QUICK_PROMPTS = [
  "วันนี้ควรโฟกัสอะไร",
  "SKU ไหนควรดัน",
  "คอนเทนต์ไหนควรโพสต์",
  "สรุปรายงานวันนี้",
];

export function AICeoChatPopup({
  onUpdated,
}: {
  onUpdated: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      text: "สวัสดีครับ! ผมพร้อมช่วยวางแผนและขับเคลื่อนยอดขายของร้านคุณวันนี้ครับ 🚀\nมีอะไรให้ผมช่วยวิเคราะห์ไหมครับ?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingActionId, setSavingActionId] = useState("");
  const [savingRule, setSavingRule] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await apiFetch("/api/ceo/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const result: CeoChatResponse = await res.json();
      if (!res.ok) throw new Error((result as unknown as { error?: string }).error ?? "ถาม AI CEO ไม่สำเร็จ");

      const aiMsg: Message = {
        id: `a-${Date.now()}`,
        role: "ai",
        text: result.answer,
        actions: result.proposedActions?.length ? result.proposedActions : undefined,
        dataGaps: result.dataGaps?.length ? result.dataGaps : undefined,
        ruleSuggestion: result.ruleSuggestion || undefined,
        confidence: result.confidence,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errMsg: Message = {
        id: `e-${Date.now()}`,
        role: "ai",
        text: err instanceof Error ? err.message : "ถาม AI CEO ไม่สำเร็จ",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const addAction = async (action: CeoChatAction) => {
    setSavingActionId(action.id);
    try {
      const res = await apiFetch("/api/ceo/chat/actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(action),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "เพิ่ม Action Queue ไม่สำเร็จ");
      await onUpdated();
      setMessages((prev) => [
        ...prev,
        { id: `sys-${Date.now()}`, role: "ai", text: `✅ เพิ่มเข้า Action Queue แล้ว: ${action.title}` },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: `sys-${Date.now()}`, role: "ai", text: err instanceof Error ? err.message : "เพิ่ม Action Queue ไม่สำเร็จ" },
      ]);
    } finally {
      setSavingActionId("");
    }
  };

  const saveRule = async (ruleText: string) => {
    setSavingRule(true);
    try {
      const res = await apiFetch("/api/ceo/chat/rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: ruleText }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "บันทึก CEO rule ไม่สำเร็จ");
      setMessages((prev) => [
        ...prev,
        { id: `sys-${Date.now()}`, role: "ai", text: "✅ บันทึก CEO rule แล้ว รอบถัดไป Marketing/Content จะอ่านกฎนี้" },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: `sys-${Date.now()}`, role: "ai", text: err instanceof Error ? err.message : "บันทึก CEO rule ไม่สำเร็จ" },
      ]);
    } finally {
      setSavingRule(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Trigger button inside CEO card — rendered separately, this component only owns the popup */}
      <button className="primary-action ceo-chat-open-btn" onClick={() => setOpen(true)}>
        คุยกับ CEO
      </button>

      {open && (
        <div className="ceo-popup-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="ceo-popup" role="dialog" aria-label="คุยกับ AI CEO">
            {/* Header */}
            <div className="ceo-popup-header">
              <div className="ceo-popup-avatar">
                <Bot size={22} />
              </div>
              <div className="ceo-popup-title">
                <strong>AI CEO <span>(Claude)</span></strong>
                <small>ออนไลน์ • กำลังทำงาน</small>
              </div>
              <button
                className="ceo-popup-close"
                aria-label="ปิด"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="ceo-popup-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`ceo-msg ceo-msg-${msg.role}`}>
                  {msg.role === "ai" && (
                    <div className="ceo-msg-avatar"><Bot size={14} /></div>
                  )}
                  <div className="ceo-msg-bubble">
                    <p>{msg.text}</p>

                    {msg.confidence && (
                      <span className={`ceo-confidence ceo-confidence-${msg.confidence}`}>
                        confidence: {msg.confidence}
                      </span>
                    )}

                    {msg.dataGaps && msg.dataGaps.length > 0 && (
                      <div className="ceo-msg-gaps">
                        <strong>ข้อมูลที่ยังขาด</strong>
                        {msg.dataGaps.slice(0, 3).map((gap) => (
                          <span key={gap}>{gap}</span>
                        ))}
                      </div>
                    )}

                    {msg.actions && msg.actions.length > 0 && (
                      <div className="ceo-msg-actions">
                        <strong>Action ที่ CEO เสนอ</strong>
                        {msg.actions.map((action) => (
                          <article key={action.id}>
                            <div>
                              <b>{action.title}</b>
                              <span>{action.owner} • {action.priority}{action.sku ? ` • ${action.sku}` : ""}</span>
                            </div>
                            <button
                              onClick={() => addAction(action)}
                              disabled={savingActionId === action.id}
                            >
                              {savingActionId === action.id ? "กำลังเพิ่ม..." : "เพิ่มคิว"}
                            </button>
                          </article>
                        ))}
                      </div>
                    )}

                    {msg.ruleSuggestion && (
                      <div className="ceo-msg-rule">
                        <strong>CEO rule ที่แนะนำ</strong>
                        <p>{msg.ruleSuggestion}</p>
                        <button onClick={() => saveRule(msg.ruleSuggestion!)} disabled={savingRule}>
                          {savingRule ? "กำลังบันทึก..." : "บันทึกเป็นกฎ CEO"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="ceo-msg ceo-msg-ai">
                  <div className="ceo-msg-avatar"><Bot size={14} /></div>
                  <div className="ceo-msg-bubble ceo-msg-typing">
                    <span /><span /><span />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Quick prompts */}
            {messages.length <= 1 && (
              <div className="ceo-popup-quick">
                {QUICK_PROMPTS.map((q) => (
                  <button key={q} onClick={() => sendMessage(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="ceo-popup-input">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="พิมพ์ข้อความถึง CEO... (Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
                rows={1}
                disabled={loading}
              />
              <button
                className="ceo-popup-send"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                aria-label="ส่ง"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
