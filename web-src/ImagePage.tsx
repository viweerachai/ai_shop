import {
  AlertTriangle,
  Box,
  Check,
  Eye,
  FileImage,
  Image,
  LayoutTemplate,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  WandSparkles,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "./apiClient";

type NavigateFn = (
  page: string,
  context?: { sku?: string; contentId?: string; promotionId?: string; query?: string; tab?: "promotions" | "approvals" }
) => void;

type ImagePlan = {
  id: string; theme: string; contentType: string; productSku: string; productName: string;
  platform: string; imageType: "template" | "product_photo" | "ai_image" | "";
  imageConcept: string; imageText: string; imagePrompt: string; imageNote: string;
  imageStatus: string;
  generatedImageUrl: string;
  generatedImageFile: string;
  generatedImageProvider: string;
  generatedImageModel: string;
  generatedImagePrompt: string;
  generatedImageAt: string;
  imageApprovalStatus: string;
  availableAssets: string[]; assetNote: string;
  assetSource?: "sheet" | "drive" | "fallback" | "demo";
  driveFolderId?: string;
  driveFolderUrl?: string;
  driveAssetCount?: number;
  driveFiles?: Array<{
    id: string;
    name: string;
    mimeType: string;
    webViewLink: string;
    webContentLink: string;
    thumbnailLink: string;
    modifiedTime: string;
  }>;
  brandedProduct: boolean; canMakeUnboxing: boolean; status: string;
  riskLevel: "low" | "medium" | "high"; updatedAt: string;
};
type ImageData = {
  mode: "live" | "demo";
  summary: { total: number; waiting: number; ready: number; productPhoto: number; template: number; aiImage: number };
  plans: ImagePlan[];
};

const imageTypeLabels = {
  product_photo: "Product Photo",
  template: "Template",
  ai_image: "AI Image",
  "": "รอวางแผน"
};

export function ImagePage({
  onMessage,
  onNavigate
}: {
  onMessage: (message: string) => void;
  onNavigate?: NavigateFn;
}) {
  const [data, setData] = useState<ImageData | null>(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [selected, setSelected] = useState<ImagePlan | null>(null);
  const [running, setRunning] = useState(false);
  const [generatingId, setGeneratingId] = useState("");

  const load = useCallback(async () => {
    const response = await apiFetch("/api/images");
    if (!response.ok) throw new Error("โหลด Image Plans ไม่สำเร็จ");
    setData(await response.json());
  }, []);
  useEffect(() => { load().catch((error) => onMessage(error.message)); }, [load, onMessage]);

  const filtered = useMemo(() => (data?.plans ?? []).filter((plan) => {
    const text = `${plan.theme} ${plan.productSku} ${plan.productName}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (type === "all" || plan.imageType === type);
  }), [data, query, type]);

  async function runImagePlan() {
    setRunning(true);
    try {
      const response = await apiFetch("/api/workflows/image:plan/run", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "สร้าง Image Brief ไม่สำเร็จ");
      onMessage(`เริ่ม Image Planner แล้ว Run ID: ${result.runId}`);
      await load();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally { setRunning(false); }
  }

  async function generateImage(plan: ImagePlan) {
    setGeneratingId(plan.id);
    try {
      const response = await apiFetch(`/api/images/${encodeURIComponent(plan.id)}/generate`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "สร้างภาพ AI ไม่สำเร็จ");
      onMessage(`สร้างภาพ AI แล้ว: ${result.result?.fileName ?? plan.theme}`);
      await load();
      const refreshed = await apiFetch("/api/images").then((res) => res.json() as Promise<ImageData>);
      const nextSelected = refreshed.plans.find((item) => item.id === plan.id);
      setData(refreshed);
      if (nextSelected) setSelected(nextSelected);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setGeneratingId("");
    }
  }

  if (!data) return <div className="panel products-loading"><RefreshCw className="spin" /> กำลังโหลด Image Plans...</div>;
  const stats = [
    ["ทั้งหมด", data.summary.total, FileImage, "blue"],
    ["รอวางแผน", data.summary.waiting, RefreshCw, "yellow"],
    ["Brief พร้อม", data.summary.ready, Check, "green"],
    ["Product Photo", data.summary.productPhoto, Image, "purple"],
    ["Template", data.summary.template, LayoutTemplate, "blue"],
    ["AI Image", data.summary.aiImage, WandSparkles, "pink"]
  ] as const;

  return <div className="image-page">
    <div className="content-summary-grid">
      {stats.map(([label, value, Icon, tone]) => <div className={`panel content-stat tone-${tone}`} key={label}><span><Icon size={20} /></span><strong>{value}</strong><small>{label}</small></div>)}
    </div>
    <div className="panel image-toolbar">
      <div className="product-search"><Search size={17} /><input aria-label="ค้นหา Image Plan" placeholder="ค้นหาหัวข้อหรือ SKU" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <label className="filter-control"><Image size={15} /><select aria-label="กรองประเภทภาพ" value={type} onChange={(event) => setType(event.target.value)}>
        <option value="all">ทุกประเภทภาพ</option><option value="product_photo">Product Photo</option><option value="template">Template</option><option value="ai_image">AI Image</option><option value="">รอวางแผน</option>
      </select></label>
      <button className="run-product-button" onClick={runImagePlan} disabled={running}>{running ? <RefreshCw className="spin" size={16} /> : <Play size={16} />}{running ? "กำลังวางแผน..." : "สร้าง Image Brief"}</button>
    </div>
    <div className="image-grid">
      {filtered.map((plan, index) => <article className={`panel image-plan-card image-type-${plan.imageType || "waiting"}`} key={plan.id}>
        <div className={`image-preview preview-${index % 4}`}>
          {plan.generatedImageUrl
            ? <img src={plan.generatedImageUrl} alt={`AI draft ${plan.theme}`} />
            : <>
              {plan.imageType === "template" ? <LayoutTemplate size={38} /> : plan.imageType === "ai_image" ? <WandSparkles size={38} /> : <Image size={38} />}
              <span>{imageTypeLabels[plan.imageType]}</span>
            </>}
        </div>
        <div className="image-card-body">
          <div className="queue-card-top"><span className="content-type-badge">{plan.contentType}</span><span className={`risk-badge risk-${plan.riskLevel}`}>{plan.riskLevel}</span></div>
          <h3>{plan.theme}</h3><p>{plan.productName}</p>
          <div className="image-source-line">
            <span>{plan.assetSource === "drive" ? "Drive folder" : plan.assetSource === "sheet" ? "Sheet index" : "Fallback"}</span>
            {!!plan.driveAssetCount && <strong>{plan.driveAssetCount} files</strong>}
          </div>
          <div className="asset-list">{plan.availableAssets.length ? plan.availableAssets.slice(0, 3).map((asset) => <span key={asset}>{asset}</span>) : <em>ไม่มี product asset</em>}</div>
          <div className="image-compliance">
            <span className={plan.brandedProduct && plan.imageType === "ai_image" ? "bad" : "good"}>{plan.brandedProduct ? "Branded Product" : "General Visual"}</span>
            <span className="muted">ปิด Unboxing</span>
            {plan.generatedImageUrl && <span className="good">Background Draft พร้อม</span>}
          </div>
          {onNavigate && (
            <div className="image-quick-actions">
              <button type="button" className="mini-action" onClick={() => onNavigate("products", { sku: plan.productSku })}>ดูสินค้า</button>
              <button type="button" className="mini-action" onClick={() => onNavigate("content", { query: plan.productSku })}>ดูคิวคอนเทนต์</button>
            </div>
          )}
          <div className="image-card-actions">
            <button aria-label={`ดู Image Plan ${plan.theme}`} onClick={() => setSelected(plan)}><Eye size={15} />ดู Image Brief</button>
            <button
              aria-label={`สร้างภาพ AI ${plan.theme}`}
              onClick={() => generateImage(plan)}
              disabled={generatingId === plan.id || !plan.imageStatus}
            >
              {generatingId === plan.id ? <RefreshCw className="spin" size={15} /> : <WandSparkles size={15} />}
              {plan.generatedImageUrl ? "สร้างใหม่" : "สร้างภาพ AI"}
            </button>
          </div>
        </div>
      </article>)}
      {!filtered.length && <div className="panel empty-state">ไม่พบ Image Plan</div>}
    </div>
    {selected && <ImageDrawer plan={selected} onClose={() => setSelected(null)} onGenerate={generateImage} generating={generatingId === selected.id} />}
  </div>;
}

function ImageDrawer({
  plan,
  onClose,
  onGenerate,
  generating
}: {
  plan: ImagePlan;
  onClose: () => void;
  onGenerate: (plan: ImagePlan) => void;
  generating: boolean;
}) {
  const unsafeAi = plan.brandedProduct && plan.imageType === "ai_image";
  return <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="content-drawer" aria-label="รายละเอียด Image Plan">
      <div className="drawer-head"><div><span className="eyebrow">IMAGE CREATIVE BRIEF</span><h2>{plan.theme}</h2><p>{plan.productName} · {plan.platform}</p></div><button aria-label="ปิด Image Plan" onClick={onClose}><X /></button></div>
      <div className="image-drawer-type"><span>{imageTypeLabels[plan.imageType]}</span><strong>{plan.imageStatus || "รอวางแผน"}</strong></div>
      <section>
        <h3>AI Draft Preview</h3>
        {plan.generatedImageUrl
          ? <img className="generated-image-preview" src={plan.generatedImageUrl} alt={`AI draft ${plan.theme}`} />
          : <p className="drawer-note">ยังไม่มีภาพที่สร้างจาก AI กดสร้างหลัง Image Brief พร้อม</p>}
        <button className="drawer-primary-action" onClick={() => onGenerate(plan)} disabled={generating || !plan.imageStatus}>
          {generating ? <RefreshCw className="spin" size={15} /> : <WandSparkles size={15} />}
          {plan.generatedImageUrl ? "สร้างภาพใหม่" : "สร้างภาพ AI"}
        </button>
        {plan.generatedImageAt && <p className="drawer-note">สร้างล่าสุด: {plan.generatedImageAt} · {plan.generatedImageModel}</p>}
        <p className="drawer-note">ภาพนี้เป็น background/template draft เท่านั้น ระบบตั้งใจไม่ให้ AI วาดสินค้าจริงหรือแพ็กเกจแบรนด์</p>
      </section>
      <section><h3>Image Concept</h3><div className="caption-box">{plan.imageConcept || "ยังไม่มี Image Concept"}</div></section>
      <section><h3>ข้อความบนภาพ</h3><div className="image-text-preview">{plan.imageText || "ไม่มีข้อความบนภาพ"}</div></section>
      {plan.imagePrompt && <section><h3>AI Image Prompt</h3><div className="prompt-box">{plan.imagePrompt}</div></section>}
      <section><h3>Available Assets</h3><div className="drawer-assets">{plan.availableAssets.length ? plan.availableAssets.map((asset) => <span key={asset}><Box size={13} />{asset}</span>) : <em>ไม่มี asset จากสินค้า</em>}</div><p className="drawer-note">{plan.assetNote}</p></section>
      {plan.driveFolderUrl && <section><h3>Drive Folder</h3><a className="drive-folder-link" href={plan.driveFolderUrl} target="_blank" rel="noreferrer">{plan.driveFolderUrl}</a>{plan.driveFiles?.length ? <div className="drawer-assets">{plan.driveFiles.slice(0, 8).map((file) => <span key={file.id}><FileImage size={13} />{file.name}</span>)}</div> : <p className="drawer-note">ยังไม่มีไฟล์ใน folder นี้</p>}</section>}
      <section><h3>Safety Check</h3>
        {unsafeAi && <div className="drawer-issue"><AlertTriangle size={15} />สินค้าแบรนด์ห้ามสร้างภาพสินค้าปลอมด้วย AI</div>}
        <div className="rule-callout"><AlertTriangle size={15} />ระบบปิดคอนเทนต์เปิดกล่อง เพื่อเลี่ยงการสร้างภาพที่ไม่มี asset จริง</div>
        <div className="drawer-ok"><Check size={15} />Image Creative สร้างเฉพาะ brief ไม่สร้างหรือโพสต์ภาพจริง</div>
      </section>
      <section><h3>Creative Note</h3><p className="drawer-note">{plan.imageNote || "ไม่มีหมายเหตุ"}</p></section>
    </aside>
  </div>;
}
