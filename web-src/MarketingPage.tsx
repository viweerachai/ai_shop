import {
  AlertTriangle,
  BarChart3,
  Bot,
  Boxes,
  Check,
  Lightbulb,
  Megaphone,
  Play,
  RefreshCw,
  Sparkles,
  Tags,
  Target,
  Users
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./apiClient";
import { StrategyActionPanel } from "./StrategyActionPanel";
import { StrategyActionActivity } from "./StrategyActionActivity";

type NavigateFn = (
  page: string,
  context?: { sku?: string; contentId?: string; promotionId?: string; query?: string; tab?: "promotions" | "approvals" }
) => void;

type MarketingData = {
  mode: "live" | "demo";
  campaign: {
    name: string;
    targetCustomer: string;
    keyMessage: string;
    contentMix: string[];
    productFocus: Array<{ sku: string; name: string; reason: string; stock: number | null; riskLevel: "low" | "medium" | "high"; score: number; salesLast7d: number; salesLast30d: number; revenueLast30d: number }>;
    ideas: string[];
    promotionIdeas: string[];
    warnings: string[];
    generatedAt: string;
  };
  strategy: {
    shopPriority: string;
    weeklyDirection: string;
    marketingInstruction: string;
    managerInstruction: string;
    salesSource: string;
    drivers: string[];
    watchouts: string[];
    nextMoves: string[];
    actions: Array<{ id: string; title: string; owner: "CEO" | "Marketing" | "Manager" | "Owner"; priority: "high" | "medium" | "low"; status: "ready" | "in_progress" | "completed" | "watch" | "blocked"; reason: string; source: "sales" | "content" | "promotion" | "operations"; sku?: string }>;
    activeTasks: Array<{ taskId: string; actionId: string; title: string; owner: "CEO" | "Marketing" | "Manager" | "Owner"; status: "open" | "done" | "canceled"; source: "sales" | "content" | "promotion" | "operations"; detail: string; sku?: string; createdAt: string; updatedAt: string }>;
    recentHistory: Array<{ historyId: string; actionId: string; title: string; transition: "started" | "completed" | "reset" | "status_changed"; fromStatus: "ready" | "in_progress" | "completed" | "watch" | "blocked" | "none"; toStatus: "ready" | "in_progress" | "completed" | "watch" | "blocked" | "none"; createdAt: string; note: string }>;
    recentArtifacts: Array<{ artifactId: string; actionId: string; kind: "content_plan" | "promotion_plan" | "stock_followup"; status: "draft" | "open" | "done" | "canceled"; title: string; summary: string; owner: "CEO" | "Marketing" | "Manager" | "Owner"; sku?: string; createdAt: string; updatedAt: string }>;
  };
  summary: {
    eligibleProducts: number;
    newArrivals: number;
    promotionCandidates: number;
    contentPlanned: number;
    salesOrders30d: number;
    revenue30d: number;
  };
};

export function MarketingPage({
  onMessage,
  onNavigate,
  focusSku
}: {
  onMessage: (message: string) => void;
  onNavigate: NavigateFn;
  focusSku?: string;
}) {
  const [data, setData] = useState<MarketingData | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    const response = await apiFetch("/api/marketing");
    if (!response.ok) throw new Error("โหลดข้อมูล Marketing ไม่สำเร็จ");
    setData(await response.json());
  }, []);

  useEffect(() => {
    load().catch((error) => onMessage(error.message));
  }, [load, onMessage]);

  async function runCampaign() {
    setRunning(true);
    try {
      const response = await apiFetch("/api/workflows/marketing:campaign/run", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "สร้าง Campaign ไม่สำเร็จ");
      onMessage(`สร้าง Marketing Campaign แล้ว Run ID: ${result.runId}`);
      await load();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setRunning(false);
    }
  }

  if (!data) return <div className="panel products-loading"><RefreshCw className="spin" /> กำลังโหลด Marketing...</div>;

  const focusItems = focusSku
    ? [...data.campaign.productFocus].sort((left, right) => Number(right.sku === focusSku) - Number(left.sku === focusSku))
    : data.campaign.productFocus;

  return (
    <div className="marketing-page">
      <div className="marketing-summary">
        <MarketingMetric icon={Boxes} label="สินค้าพร้อมทำตลาด" value={data.summary.eligibleProducts} tone="blue" />
        <MarketingMetric icon={Sparkles} label="สินค้าเข้าใหม่" value={data.summary.newArrivals} tone="purple" />
        <MarketingMetric icon={Tags} label="Promotion Candidates" value={data.summary.promotionCandidates} tone="yellow" />
        <MarketingMetric icon={Megaphone} label="คอนเทนต์ในแผน" value={data.summary.contentPlanned} tone="green" />
        <MarketingMetric icon={BarChart3} label="Orders 30d" value={data.summary.salesOrders30d} tone="pink" />
      </div>

      <div className="marketing-layout">
        <section className="marketing-main">
          <div className="panel campaign-hero">
            <div className="campaign-kicker"><Megaphone size={18} /> CURRENT CAMPAIGN <span className={`data-mode mode-${data.mode}`}>{data.mode}</span></div>
            <div className="campaign-title-row">
              <div>
                <h2>{data.campaign.name}</h2>
                <p>{data.campaign.keyMessage}</p>
              </div>
              <button className="run-product-button" onClick={runCampaign} disabled={running}>
                {running ? <RefreshCw className="spin" size={16} /> : <Play size={16} />}
                {running ? "กำลังวางแผน..." : "สร้าง Campaign ใหม่"}
              </button>
            </div>
            <div className="target-customer"><Users size={18} /><div><span>กลุ่มลูกค้าเป้าหมาย</span><strong>{data.campaign.targetCustomer}</strong></div></div>
            <div className="marketing-brief-grid">
              <article><span>CEO Priority</span><strong>{data.strategy.shopPriority}</strong></article>
              <article><span>Marketing Direction</span><strong>{data.strategy.weeklyDirection}</strong></article>
            </div>
          </div>

          <div className="marketing-two-col">
            <div className="panel">
              <div className="section-heading"><Target size={18} /><h2>Product Focus</h2></div>
              <div className="focus-products">
                {focusItems.length
                  ? focusItems.map((item, index) =>
                    <button key={item.sku} type="button" onClick={() => onNavigate("products", { sku: item.sku })}>
                      <span>{index + 1}</span>
                      <div className="focus-product-copy">
                        <strong>{item.name}</strong>
                        <small>{item.sku} • stock {item.stock ?? "-"} • sold 7d {item.salesLast7d}</small>
                        <em>{item.reason}</em>
                      </div>
                      <b className={`risk-badge risk-${item.riskLevel}`}>{item.riskLevel}</b>
                    </button>)
                  : <div className="empty-state">ยังไม่มีสินค้าที่เลือก</div>}
              </div>
            </div>
            <div className="panel">
              <div className="section-heading"><Megaphone size={18} /><h2>Content Mix</h2></div>
              <div className="content-mix">
                {data.campaign.contentMix.map((mix, index) => (
                  <div key={mix}><span>{mix}</span><i style={{ width: `${Math.max(24, 90 - index * 13)}%` }} /></div>
                ))}
                {!data.campaign.contentMix.length && <div className="empty-state">รอสร้าง Campaign</div>}
              </div>
            </div>
          </div>

          <div className="panel marketing-ideas">
            <div className="section-heading"><Lightbulb size={18} /><h2>Recommended Content Ideas</h2></div>
            <div className="idea-grid">
              {data.campaign.ideas.map((idea, index) => (
                <article key={idea}><span>{String(index + 1).padStart(2, "0")}</span><p>{idea}</p></article>
              ))}
              {!data.campaign.ideas.length && <div className="empty-state">ยังไม่มีไอเดียล่าสุด</div>}
            </div>
          </div>

          <div className="panel">
            <div className="section-heading"><Bot size={18} /><h2>Execution Queue</h2></div>
            <StrategyActionPanel items={data.strategy.actions} onMessage={onMessage} onUpdated={load} />
          </div>

          <div className="panel">
            <div className="section-heading"><BarChart3 size={18} /><h2>Execution History</h2></div>
            <StrategyActionActivity tasks={data.strategy.activeTasks} history={data.strategy.recentHistory} />
          </div>

          <div className="panel">
            <div className="section-heading"><Sparkles size={18} /><h2>Generated Artifacts</h2></div>
            <div className="marketing-brief-list">
              {data.strategy.recentArtifacts.length
                ? data.strategy.recentArtifacts.slice(0, 6).map((item) => (
                  <button
                    className="marketing-list-item nav-list-button"
                    key={item.artifactId}
                    type="button"
                    onClick={() => onNavigate(
                      item.kind === "promotion_plan" ? "promotions" : "content",
                      item.kind === "promotion_plan"
                        ? { sku: item.sku, query: item.sku ?? item.title }
                        : { sku: item.sku, query: item.sku ?? item.title }
                    )}
                  >
                    {item.status === "done" ? <Check size={14} /> : <Sparkles size={14} />}
                    <span>{item.title}</span>
                  </button>
                ))
                : <div className="empty-state">ยังไม่มี artifact ที่แตกออกจาก queue</div>}
            </div>
          </div>
        </section>

        <aside className="marketing-side">
          <div className="panel strategist-card">
            <div className="strategist-avatar"><Bot size={35} /></div>
            <h2>AI Marketing Strategist</h2>
            <span>วางแผนจาก CEO Strategy และข้อมูลสินค้าจริง</span>
            <div className="online"><i />พร้อมทำงาน</div>
          </div>
          <div className="panel">
            <div className="section-heading"><Megaphone size={18} /><h2>CEO to Marketing Brief</h2></div>
            <div className="marketing-brief-list">
              <div className="marketing-list-item"><Megaphone size={14} /><span>{data.strategy.marketingInstruction}</span></div>
              <div className="marketing-list-item"><Check size={14} /><span>{data.strategy.managerInstruction}</span></div>
            </div>
            <div className="owner-approval-note"><AlertTriangle size={15} />{data.strategy.watchouts[0] ?? "ตรวจความเสี่ยงและกฎร้านก่อนเผยแพร่ทุกครั้ง"}</div>
          </div>
          <div className="panel">
            <div className="section-heading"><BarChart3 size={18} /><h2>Sales Order Data</h2></div>
            <button className="marketing-list-item nav-list-button" type="button" onClick={() => onNavigate("reports")}>
              <BarChart3 size={14} /><span>แหล่งข้อมูล: {data.strategy.salesSource}</span>
            </button>
            <div className="marketing-list-item"><Sparkles size={14} /><span>{data.summary.salesOrders30d} ออเดอร์ใน 30 วันล่าสุด</span></div>
            <div className="marketing-list-item"><Target size={14} /><span>รายได้ 30 วันล่าสุด {new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(data.summary.revenue30d)}</span></div>
          </div>
          <div className="panel">
            <div className="section-heading"><Tags size={18} /><h2>Promotion Ideas</h2></div>
            {data.campaign.promotionIdeas.length
              ? data.campaign.promotionIdeas.map((idea) => (
                <button className="marketing-list-item promo nav-list-button" key={idea} type="button" onClick={() => onNavigate("promotions", { query: idea })}>
                  <Tags size={14} /><span>{idea}</span>
                </button>
              ))
              : <div className="empty-state">ยังไม่มีข้อเสนอ</div>}
            <div className="owner-approval-note"><AlertTriangle size={15} />ทุก Promotion ต้องรอเจ้าของร้านอนุมัติ</div>
          </div>
          {!!data.campaign.warnings.length && (
            <div className="panel">
              <div className="section-heading"><AlertTriangle size={18} /><h2>Watchouts</h2></div>
              {data.campaign.warnings.map((warning) => <div className="marketing-list-item warning" key={warning}><AlertTriangle size={14} /><span>{warning}</span></div>)}
            </div>
          )}
          {!!data.strategy.nextMoves.length && (
            <div className="panel">
              <div className="section-heading"><Lightbulb size={18} /><h2>Next Moves</h2></div>
              {data.strategy.nextMoves.map((move) => (
                <button
                  className="marketing-list-item nav-list-button"
                  key={move}
                  type="button"
                  onClick={() => onNavigate(
                    /promo|bundle|discount|โปร/i.test(move) ? "promotions" : /content|caption|post|โพสต์|qa/i.test(move) ? "content" : "products",
                    { query: move }
                  )}
                >
                  <Target size={14} /><span>{move}</span>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function MarketingMetric({ icon: Icon, label, value, tone }: { icon: typeof Boxes; label: string; value: number; tone: string }) {
  return <div className={`panel marketing-metric tone-${tone}`}><span><Icon size={21} /></span><div><strong>{value}</strong><small>{label}</small></div></div>;
}
