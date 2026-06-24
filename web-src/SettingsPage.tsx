import { Database, FileJson, KeyRound, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch, getAdminToken, setAdminToken } from "./apiClient";

type Overview = {
  generatedAt: string;
  mode: "live" | "demo";
  integrations: Record<string, { configured: boolean; detail: string }>;
  imports: {
    productImports: null | { sourceLabel: string; importedAt: string; rowCount: number };
    salesOrders: null | { sourceLabel: string; importedAt: string; rowCount: number };
    stockUpdates: null | { sourceLabel: string; importedAt: string; rowCount: number };
  };
  settings: {
    autoMode: string;
    autoPublish: boolean;
    minScore: number;
    maxRisk: string;
  };
  workflowReadiness: Array<{
    name: string;
    ready: boolean;
    requires: { googleSheets: boolean; gemini: boolean; claude: boolean };
  }>;
  docs: { openApiJson: string };
};

type HealthStatus = {
  ok: boolean;
  mode: "live" | "demo";
  geminiConfigured: boolean;
  claudeConfigured: boolean;
  adminTokenConfigured: boolean;
  timestamp: string;
};

function formatDate(value?: string | null) {
  if (!value) return "ยังไม่เคยนำเข้า";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(value));
}

type Props = {
  onMessage: (message: string) => void;
};

export function SettingsPage({ onMessage }: Props) {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesPath, setSalesPath] = useState("");
  const [stockPath, setStockPath] = useState("");
  const [productPath, setProductPath] = useState("");
  const [adminToken, setAdminTokenInput] = useState("");
  const [busy, setBusy] = useState<"sales" | "stock" | "products" | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [checking, setChecking] = useState<"" | "health" | "docs" | "workflow">("");

  const load = useCallback(async () => {
    try {
      const response = await apiFetch("/api/system/overview");
      if (!response.ok) throw new Error("โหลดสถานะระบบไม่สำเร็จ");
      setData(await response.json());
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "โหลดสถานะระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => {
    setAdminTokenInput(getAdminToken());
    load();
  }, [load]);

  async function submitImport(event: FormEvent, kind: "sales" | "stock") {
    event.preventDefault();
    const filePath = kind === "sales" ? salesPath : stockPath;
    if (!filePath.trim()) {
      onMessage("กรุณาใส่ path ของไฟล์ CSV");
      return;
    }
    setBusy(kind);
    try {
      const response = await apiFetch(`/api/imports/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filePath })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "นำเข้าข้อมูลไม่สำเร็จ");
      onMessage(kind === "sales" ? `นำเข้ายอดขายแล้ว ${result.imported} แถว` : `อัปเดต stock แล้ว ${result.updatedProcessed ?? 0} SKU`);
      await load();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "นำเข้าข้อมูลไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  async function submitProductImport(event: FormEvent) {
    event.preventDefault();
    if (!productPath.trim()) {
      onMessage("กรุณาใส่ path ของไฟล์ BigSeller SKU Excel");
      return;
    }
    setBusy("products");
    try {
      const response = await apiFetch("/api/imports/products/bigseller", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filePath: productPath })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "นำเข้าสินค้าไม่สำเร็จ");
      onMessage(`นำเข้าสินค้าแล้ว ${result.importedRaw} SKU • รูป ${result.importedAssets} รายการ • ไม่มีราคาขาย ${result.missingSellingPrice}`);
      await load();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "นำเข้าสินค้าไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  function saveToken(event: FormEvent) {
    event.preventDefault();
    setAdminToken(adminToken);
    onMessage(adminToken.trim() ? "บันทึก admin token แล้ว" : "ล้าง admin token แล้ว");
    load().catch(() => undefined);
  }

  async function checkHealth() {
    setChecking("health");
    try {
      const response = await apiFetch("/api/health");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "ตรวจ health ไม่สำเร็จ");
      setHealth(result);
      onMessage(`ระบบ ${result.ok ? "พร้อมใช้งาน" : "มีปัญหา"} • mode: ${result.mode}`);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "ตรวจ health ไม่สำเร็จ");
    } finally {
      setChecking("");
    }
  }

  async function openOpenApi() {
    setChecking("docs");
    try {
      const response = await apiFetch(data?.docs.openApiJson ?? "/api/docs/openapi.json");
      const result = await response.json();
      if (!response.ok) throw new Error("โหลด OpenAPI ไม่สำเร็จ");
      window.open(data?.docs.openApiJson ?? "/api/docs/openapi.json", "_blank", "noopener,noreferrer");
      onMessage(`OpenAPI พร้อมใช้งาน • ${Object.keys(result.paths ?? {}).length} paths`);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "โหลด OpenAPI ไม่สำเร็จ");
    } finally {
      setChecking("");
    }
  }

  async function runWorkflow(name: string) {
    setChecking("workflow");
    try {
      const response = await apiFetch(`/api/workflows/${name}/run`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? `รัน ${name} ไม่สำเร็จ`);
      onMessage(`เริ่ม workflow ${name} แล้ว Run ID: ${result.runId}`);
      await load();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : `รัน ${name} ไม่สำเร็จ`);
    } finally {
      setChecking("");
    }
  }

  if (loading || !data) {
    return <div className="panel empty-state">กำลังโหลดสถานะระบบ...</div>;
  }

  return (
    <div className="settings-page">
      <section className="panel settings-hero">
        <div>
          <div className="section-heading"><ShieldCheck size={18} /><h2>System Operations</h2></div>
          <p>หน้าจอนี้ใช้ดูว่าระบบพร้อมต่อของจริงแค่ไหน, ข้อมูลล่าสุดมาจากไหน, และ endpoint ไหนใช้สำหรับ import หรือเชื่อมระบบภายนอก</p>
        </div>
        <div className="settings-hero-actions">
          <button className="run-product-button" onClick={() => load()}><RefreshCw size={16} />รีเฟรชสถานะ</button>
          <button className="run-product-button secondary-action" onClick={checkHealth} disabled={checking === "health"}>ตรวจ Health</button>
          <button className="run-product-button secondary-action" onClick={openOpenApi} disabled={checking === "docs"}>ดู OpenAPI</button>
        </div>
      </section>

      {health && (
        <section className="settings-grid">
          <div className="panel settings-health-card">
            <div className="section-heading"><ShieldCheck size={18} /><h2>Live Health Check</h2></div>
            <div className="settings-health-grid">
              <article><strong>{health.ok ? "OK" : "ERROR"}</strong><span>status</span></article>
              <article><strong>{health.mode}</strong><span>mode</span></article>
              <article><strong>{health.geminiConfigured ? "พร้อม" : "ยังไม่พร้อม"}</strong><span>Gemini</span></article>
              <article><strong>{health.claudeConfigured ? "พร้อม" : "ยังไม่พร้อม"}</strong><span>Claude</span></article>
            </div>
          </div>
        </section>
      )}

      <section className="settings-grid">
        <div className="panel">
          <div className="section-heading"><Database size={18} /><h2>Integration Status</h2></div>
          <div className="settings-status-list">
            {Object.entries(data.integrations).map(([key, item]) => (
              <article key={key} className={item.configured ? "ready" : "waiting"}>
                <strong>{key}</strong>
                <span>{item.configured ? "พร้อมใช้งาน" : "ยังไม่พร้อม"}</span>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="section-heading"><Upload size={18} /><h2>Latest Imports</h2></div>
          <div className="settings-import-meta">
            <article>
              <strong>Product Imports</strong>
              <span>{data.imports.productImports?.sourceLabel ?? "ยังไม่มีข้อมูล"}</span>
              <p>{formatDate(data.imports.productImports?.importedAt)} · {data.imports.productImports?.rowCount ?? 0} rows</p>
            </article>
            <article>
              <strong>Sales Orders</strong>
              <span>{data.imports.salesOrders?.sourceLabel ?? "ยังไม่มีข้อมูล"}</span>
              <p>{formatDate(data.imports.salesOrders?.importedAt)} · {data.imports.salesOrders?.rowCount ?? 0} rows</p>
            </article>
            <article>
              <strong>Stock Updates</strong>
              <span>{data.imports.stockUpdates?.sourceLabel ?? "ยังไม่มีข้อมูล"}</span>
              <p>{formatDate(data.imports.stockUpdates?.importedAt)} · {data.imports.stockUpdates?.rowCount ?? 0} rows</p>
            </article>
          </div>
        </div>
      </section>

      <section className="settings-grid">
        <form className="panel import-form" onSubmit={submitProductImport}>
          <div className="section-heading"><Upload size={18} /><h2>Import BigSeller SKU Excel</h2></div>
          <p>นำเข้าไฟล์ Merchant SKU Excel แล้วสร้าง raw_products และ product_assets อัตโนมัติ</p>
          <input value={productPath} onChange={(event) => setProductPath(event.target.value)} placeholder="/absolute/path/to/SKU_Merchant.xlsx" />
          <button className="run-product-button" disabled={busy === "products"}>{busy === "products" ? "กำลังนำเข้า..." : "Import Products"}</button>
        </form>

        <form className="panel import-form" onSubmit={saveToken}>
          <div className="section-heading"><KeyRound size={18} /><h2>Admin Token</h2></div>
          <p>ถ้าตั้ง <code>API_ADMIN_TOKEN</code> ไว้ใน server ให้ใส่ token ที่นี่เพื่อใช้กับทุก action ที่แก้ข้อมูล</p>
          <input value={adminToken} onChange={(event) => setAdminTokenInput(event.target.value)} placeholder="x-admin-token" />
          <button className="run-product-button">{adminToken.trim() ? "บันทึก Token" : "ล้าง Token"}</button>
        </form>

        <form className="panel import-form" onSubmit={(event) => submitImport(event, "sales")}>
          <div className="section-heading"><Upload size={18} /><h2>Import Sales CSV</h2></div>
          <p>ตัวอย่าง path: <code>/absolute/path/to/sales.csv</code></p>
          <input value={salesPath} onChange={(event) => setSalesPath(event.target.value)} placeholder="/absolute/path/to/sales.csv" />
          <button className="run-product-button" disabled={busy === "sales"}>{busy === "sales" ? "กำลังนำเข้า..." : "Import Sales"}</button>
        </form>

        <form className="panel import-form" onSubmit={(event) => submitImport(event, "stock")}>
          <div className="section-heading"><Upload size={18} /><h2>Import Stock CSV</h2></div>
          <p>ตัวอย่าง path: <code>/absolute/path/to/stock.csv</code></p>
          <input value={stockPath} onChange={(event) => setStockPath(event.target.value)} placeholder="/absolute/path/to/stock.csv" />
          <button className="run-product-button" disabled={busy === "stock"}>{busy === "stock" ? "กำลังนำเข้า..." : "Import Stock"}</button>
        </form>
      </section>

      <section className="settings-grid">
        <div className="panel">
          <div className="section-heading"><KeyRound size={18} /><h2>Workflow Readiness</h2></div>
          <div className="workflow-ready-list">
            {data.workflowReadiness.map((workflow) => (
              <article key={workflow.name} className={workflow.ready ? "ready" : "waiting"}>
                <strong>{workflow.name}</strong>
                <span>{workflow.ready ? "พร้อมรัน" : "รอ credentials"}</span>
                <p>
                  ต้องใช้: Google Sheets
                  {workflow.requires.gemini ? ", Gemini" : ""}
                  {workflow.requires.claude ? ", Claude" : ""}
                </p>
                <button className="mini-action" disabled={!workflow.ready || checking === "workflow"} onClick={() => runWorkflow(workflow.name)}>
                  รันทดสอบ
                </button>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="section-heading"><FileJson size={18} /><h2>API Docs</h2></div>
          <div className="settings-docs">
            <article>
              <strong>OpenAPI JSON</strong>
              <span><code>{data.docs.openApiJson}</code></span>
              <p>ใช้ endpoint นี้เพื่อให้ทีม frontend หรือระบบภายนอกดูรายการ API ที่มีอยู่ในระบบ</p>
            </article>
            <article>
              <strong>JSON Import Endpoints</strong>
              <span><code>/api/imports/sales/json</code> และ <code>/api/imports/stock/json</code></span>
              <p>เหมาะกับ connector หรือ webhook ภายใน ที่จะ push rows เข้ามาโดยตรง ไม่ต้องสร้าง CSV ก่อน</p>
            </article>
            <article>
              <strong>Product Asset Index</strong>
              <span><code>/api/product-assets</code></span>
              <p>ใช้ดูว่า SKU ไหนผูกกับ Drive folder ไหน และระบบอ่านไฟล์ asset อะไรได้บ้าง</p>
            </article>
            <article>
              <strong>Runtime Settings</strong>
              <span>autoMode: {data.settings.autoMode}</span>
              <p>autoPublish: {data.settings.autoPublish ? "เปิด" : "ปิด"} · minScore: {data.settings.minScore} · maxRisk: {data.settings.maxRisk}</p>
            </article>
            <article>
              <strong>Drive Folder Rule</strong>
              <span>1 SKU = 1 folder</span>
              <p>เก็บ folder ID ใน sheet `product_assets` แล้วให้ชื่อไฟล์สื่อความหมาย เช่น `main`, `opened`, `video`, `thumb`</p>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
