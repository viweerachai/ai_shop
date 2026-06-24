import {
  AlertTriangle,
  Box,
  Check,
  ChevronRight,
  Eye,
  Filter,
  Image,
  PackageCheck,
  Play,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Video,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "./apiClient";

type Product = {
  productId: string;
  sku: string;
  name: string;
  sourceName: string;
  category: string;
  productType: string;
  price: number | null;
  costPrice: number | null;
  stock: number | null;
  status: string;
  riskLevel: "low" | "medium" | "high";
  riskNote: string;
  isNewArrival: boolean;
  isBlindBox: boolean;
  isPreorder: boolean;
  imageUrl: string;
  driveAssetStatus: "ready" | "folder_found" | "missing_folder" | "missing_image" | "not_configured" | "demo";
  driveAssetLabel: string;
  driveAssetSource: "sheet" | "drive" | "fallback" | "demo";
  driveFolderId: string;
  driveFolderUrl: string;
  driveAssetCount: number;
  driveImageCount: number;
  trendLevel: "none" | "low" | "medium" | "high";
  trendLabels: string[];
  trendScore: number;
  trendNote: string;
  availableAssets: string[];
  assetNote: string;
  canMakeUnboxing: boolean;
  canMakeReview: boolean;
  canMakeProductShowcase: boolean;
  missingFields: string[];
  contentEligible: boolean;
  publishPriority: number;
  salesLast7d: number;
  salesLast30d: number;
  revenueLast30d: number;
  lastSoldAt: string;
  salesStatus: "top_seller" | "restock_risk" | "one_off_sold_signal" | "steady" | "slow_mover" | "no_recent_sales";
  salesLabels: string[];
  salesSummary: string;
  salesRecommendedAction: string;
  updatedAt: string;
};

type ProductResponse = {
  mode: "live" | "demo";
  summary: {
    total: number;
    newArrivals: number;
    needsCheck: number;
    ready: number;
    highRisk: number;
  };
  products: Product[];
};

const statusText: Record<string, string> = {
  new: "สินค้าใหม่",
  needs_product_check: "ต้องตรวจข้อมูล",
  needs_product_text: "รอเขียนรายละเอียด",
  product_text_ready_for_qa: "รอตรวจ QA",
  needs_product_rewrite: "ต้องเขียนใหม่",
  product_ready: "พร้อมสร้างคอนเทนต์",
  product_error: "เกิดข้อผิดพลาด"
};

function formatMoney(value: number | null) {
  return value === null
    ? "ไม่ระบุ"
    : new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string) {
  return value
    ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Tokyo" }).format(new Date(value))
    : "ยังไม่มีข้อมูล";
}

export function ProductsPage({
  onMessage,
  focusSku
}: {
  onMessage: (message: string) => void;
  focusSku?: string;
}) {
  const [data, setData] = useState<ProductResponse | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [risk, setRisk] = useState("all");
  const [selected, setSelected] = useState<Product | null>(null);
  const [running, setRunning] = useState(false);

  const loadProducts = useCallback(async () => {
    const response = await apiFetch("/api/products");
    if (!response.ok) throw new Error("โหลดข้อมูลสินค้าไม่สำเร็จ");
    setData(await response.json());
  }, []);

  useEffect(() => {
    loadProducts().catch((error) => onMessage(error.message));
  }, [loadProducts, onMessage]);

  useEffect(() => {
    if (!data || !focusSku) return;
    setQuery(focusSku);
    const match = data.products.find((product) => product.sku === focusSku);
    if (match) {
      setSelected(match);
    }
  }, [data, focusSku]);

  const filtered = useMemo(() => {
    const products = data?.products ?? [];
    const search = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search) ||
        product.sku.toLowerCase().includes(search) ||
        product.category.toLowerCase().includes(search);
      const matchesStatus = status === "all" || product.status === status;
      const matchesRisk = risk === "all" || product.riskLevel === risk;
      return matchesSearch && matchesStatus && matchesRisk;
    });
  }, [data, query, risk, status]);

  async function runProductIntake() {
    setRunning(true);
    try {
      const response = await apiFetch("/api/workflows/product:intake/run", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "เริ่มตรวจสินค้าไม่สำเร็จ");
      onMessage(`เริ่ม Product Intake แล้ว Run ID: ${result.runId}`);
      await loadProducts();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setRunning(false);
    }
  }

  if (!data) {
    return <div className="panel products-loading"><RefreshCw className="spin" /> กำลังโหลดข้อมูลสินค้า...</div>;
  }

  return (
    <div className="products-page">
      <div className="product-summary-grid">
        <SummaryCard icon={Box} label="สินค้าทั้งหมด" value={data.summary.total} tone="blue" />
        <SummaryCard icon={Sparkles} label="สินค้าเข้าใหม่" value={data.summary.newArrivals} tone="purple" />
        <SummaryCard icon={AlertTriangle} label="ต้องตรวจข้อมูล" value={data.summary.needsCheck} tone="yellow" />
        <SummaryCard icon={PackageCheck} label="พร้อมใช้งาน" value={data.summary.ready} tone="green" />
        <SummaryCard icon={ShieldAlert} label="ความเสี่ยงสูง" value={data.summary.highRisk} tone="pink" />
      </div>

      <div className="panel product-toolbar">
        <div className="product-search">
          <Search size={17} />
          <input
            aria-label="ค้นหาสินค้า"
            placeholder="ค้นหาชื่อสินค้า, SKU หรือหมวดหมู่"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <label className="filter-control">
          <Filter size={15} />
          <select aria-label="กรองตามสถานะ" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">ทุกสถานะ</option>
            <option value="new">สินค้าใหม่</option>
            <option value="needs_product_check">ต้องตรวจข้อมูล</option>
            <option value="needs_product_text">รอเขียนรายละเอียด</option>
            <option value="product_text_ready_for_qa">รอตรวจ QA</option>
            <option value="needs_product_rewrite">ต้องเขียนใหม่</option>
            <option value="product_ready">พร้อมใช้งาน</option>
          </select>
        </label>
        <label className="filter-control">
          <ShieldAlert size={15} />
          <select aria-label="กรองตามความเสี่ยง" value={risk} onChange={(event) => setRisk(event.target.value)}>
            <option value="all">ทุกระดับความเสี่ยง</option>
            <option value="low">ต่ำ</option>
            <option value="medium">ปานกลาง</option>
            <option value="high">สูง</option>
          </select>
        </label>
        <button className="run-product-button" onClick={runProductIntake} disabled={running}>
          {running ? <RefreshCw size={16} className="spin" /> : <Play size={16} />}
          {running ? "กำลังตรวจ..." : "ตรวจสินค้าใหม่"}
        </button>
      </div>

      <div className="panel product-table-panel">
        <div className="product-table-head">
          <div>
            <h2>รายการสินค้า</h2>
            <span>แสดง {filtered.length} จาก {data.summary.total} รายการ</span>
          </div>
          <span className={`data-mode mode-${data.mode}`}>{data.mode === "live" ? "LIVE DATA" : "DEMO DATA"}</span>
        </div>
        <div className="product-table-wrap">
          <table className="product-table">
            <thead>
              <tr>
                <th>สินค้า / SKU</th>
                <th>สถานะ</th>
                <th>Drive รูป</th>
                <th>สต็อก / ราคา</th>
                <th>ยอดขายล่าสุด</th>
                <th>ความเสี่ยง</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.productId}>
                  <td>
                    <div className="product-cell">
                      <ProductThumb product={product} />
                      <div>
                        <strong>{product.name}</strong>
                        <div className="product-meta-line">
                          <span className="product-sku-badge">{product.sku}</span>
                          <span>{product.category || "ไม่ระบุหมวดหมู่"}</span>
                          <TrendBadge product={product} />
                        </div>
                        <div className="product-flags">
                          {product.isNewArrival && <i className="flag-new">สินค้าใหม่</i>}
                          {product.isBlindBox && <i>Blind Box</i>}
                          {product.isPreorder && <i className="flag-preorder">Preorder</i>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td><StatusBadge status={product.status} /></td>
                  <td><DriveAssetBadge product={product} /></td>
                  <td><strong>{product.stock ?? "-"} ชิ้น</strong><span className="sub-value">{formatMoney(product.price)}</span></td>
                  <td>
                    <strong>{product.salesLast7d} / 7d</strong>
                    <span className="sub-value">{product.salesLast30d} / 30d</span>
                  </td>
                  <td><RiskBadge risk={product.riskLevel} /></td>
                  <td>
                    <button className="row-action" aria-label={`ดูสินค้า ${product.name}`} onClick={() => setSelected(product)}>
                      <Eye size={16} /><ChevronRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="empty-state">ไม่พบสินค้าที่ตรงกับตัวกรอง</div>}
        </div>
      </div>

      {selected && <ProductDrawer product={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: typeof Box; label: string; value: number; tone: string }) {
  return (
    <div className={`panel product-summary tone-${tone}`}>
      <span><Icon size={22} /></span>
      <div><strong>{value}</strong><small>{label}</small></div>
    </div>
  );
}

function ProductThumb({ product }: { product: Product }) {
  if (product.imageUrl) return <img className="product-thumb-image" src={product.imageUrl} alt="" />;
  return <div className="product-thumb-placeholder"><Box size={24} /></div>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status}`}>{statusText[status] ?? status}</span>;
}

function RiskBadge({ risk }: { risk: string }) {
  const label = risk === "high" ? "สูง" : risk === "medium" ? "ปานกลาง" : "ต่ำ";
  return <span className={`risk-badge risk-${risk}`}>{label}</span>;
}

function DriveAssetBadge({ product }: { product: Product }) {
  return (
    <div className={`drive-asset-status drive-${product.driveAssetStatus}`}>
      <span>{product.driveAssetLabel}</span>
      <small>
        {product.driveAssetStatus === "ready"
          ? `${product.driveImageCount} รูป / ${product.driveAssetCount} ไฟล์`
          : product.driveAssetStatus === "missing_folder"
          ? "ชื่อ folder ต้องตรง SKU"
          : product.driveAssetStatus === "not_configured"
          ? "ตั้ง GOOGLE_DRIVE_FOLDER_ID"
          : `${product.driveAssetCount} ไฟล์`}
      </small>
    </div>
  );
}

function TrendBadge({ product }: { product: Product }) {
  if (product.trendLevel === "none") return null;
  const label = product.trendLabels[0] || `trend ${product.trendLevel}`;
  return <span className={`trend-badge trend-${product.trendLevel}`}>นิยม: {label}</span>;
}

function Capability({ enabled, label }: { enabled: boolean; label: string }) {
  return <span className={enabled ? "capability enabled" : "capability disabled"}>{enabled ? <Check size={11} /> : <X size={11} />}{label}</span>;
}

function ProductDrawer({ product, onClose }: { product: Product; onClose: () => void }) {
  return (
    <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="product-drawer" aria-label="รายละเอียดสินค้า">
        <div className="drawer-head">
          <div>
            <span className="eyebrow">PRODUCT DETAIL</span>
            <h2>{product.name}</h2>
            <p><span className="product-sku-badge">{product.sku}</span></p>
          </div>
          <button aria-label="ปิดรายละเอียดสินค้า" onClick={onClose}><X /></button>
        </div>
        <div className="drawer-product-hero">
          <ProductThumb product={product} />
          <div><StatusBadge status={product.status} /><RiskBadge risk={product.riskLevel} /><strong>{formatMoney(product.price)}</strong><span>สต็อก {product.stock ?? "-"} ชิ้น</span></div>
        </div>
        <DrawerSection title="ข้อมูลสินค้า">
          <DetailRow label="SKU" value={product.sku} />
          <DetailRow label="ประเภท" value={product.productType || "ยังไม่ระบุ"} />
          <DetailRow label="หมวดหมู่" value={product.category || "ยังไม่ระบุ"} />
          <DetailRow label="ลำดับความสำคัญ" value={`${product.publishPriority}/100`} />
          <DetailRow label="สร้างคอนเทนต์ได้" value={product.contentEligible ? "ได้" : "ยังไม่ได้"} />
        </DrawerSection>
        <DrawerSection title="Google Drive Assets">
          <DriveAssetBadge product={product} />
          <DetailRow label="จำนวนรูป" value={`${product.driveImageCount} รูป`} />
          <DetailRow label="จำนวนไฟล์" value={`${product.driveAssetCount} ไฟล์`} />
          <DetailRow label="แหล่งที่มา" value={product.driveAssetSource} />
          {product.driveFolderUrl
            ? <a className="drive-folder-link" href={product.driveFolderUrl} target="_blank" rel="noreferrer">เปิด Drive folder</a>
            : <p className="drawer-note">ยังไม่พบโฟลเดอร์ชื่อเดียวกับ SKU ใน Drive root</p>}
        </DrawerSection>
        <DrawerSection title="Trend Signal">
          {product.trendLevel === "none"
            ? <p className="drawer-note">ยังไม่มี trend signal สำหรับ SKU/หมวดนี้</p>
            : <>
                <TrendBadge product={product} />
                <DetailRow label="ระดับกระแส" value={product.trendLevel} />
                <DetailRow label="คะแนน trend" value={`${product.trendScore}`} />
                <p className="drawer-note">{product.trendNote || product.trendLabels.join(", ")}</p>
              </>}
        </DrawerSection>
        <DrawerSection title="Sales Snapshot">
          <DetailRow label="ขาย 7 วันล่าสุด" value={`${product.salesLast7d} ชิ้น`} />
          <DetailRow label="ขาย 30 วันล่าสุด" value={`${product.salesLast30d} ชิ้น`} />
          <DetailRow label="รายได้ 30 วันล่าสุด" value={formatMoney(product.revenueLast30d)} />
          <DetailRow label="ขายล่าสุด" value={formatDate(product.lastSoldAt)} />
        </DrawerSection>
        <DrawerSection title="Sales Decision">
          {!!product.salesLabels.length && (
            <div className="drawer-assets">
              {product.salesLabels.map((label) => <span key={label}>{label}</span>)}
            </div>
          )}
          <p className="drawer-note">{product.salesSummary}</p>
          <div className="rule-callout"><Sparkles size={17} />{product.salesRecommendedAction}</div>
        </DrawerSection>
        <DrawerSection title="Assets">
          <div className="drawer-assets">
            {product.availableAssets.length
              ? product.availableAssets.map((asset) => <span key={asset}><Image size={13} />{asset}</span>)
              : <em>ยังไม่มี asset ที่ยืนยันแล้ว</em>}
          </div>
          <p className="drawer-note">{product.assetNote || "ไม่มีหมายเหตุ asset"}</p>
          <div className="drawer-capabilities">
            <Capability enabled={product.canMakeProductShowcase} label="Product Showcase" />
            <Capability enabled={product.canMakeReview} label="Review" />
            <Capability enabled={false} label="Unboxing ปิดใช้งาน" />
          </div>
        </DrawerSection>
        {(product.isBlindBox || product.isPreorder) && (
          <DrawerSection title="กฎที่ต้องใช้">
            {product.isBlindBox && <div className="rule-callout"><ShieldAlert size={17} />ต้องระบุว่าสินค้าเป็นแบบสุ่มและไม่สามารถเลือกลายได้</div>}
            {product.isPreorder && <div className="rule-callout"><Video size={17} />ต้องระบุเงื่อนไขพรีออเดอร์และการยกเลิกให้ชัดเจน</div>}
          </DrawerSection>
        )}
        <DrawerSection title="ปัญหาที่ต้องตรวจ">
          {product.missingFields.length === 0 && !product.riskNote
            ? <div className="drawer-ok"><Check size={16} />ข้อมูลหลักครบถ้วน</div>
            : <>
                {product.missingFields.map((field) => <div className="drawer-issue" key={field}><AlertTriangle size={15} />ข้อมูลขาด: {field}</div>)}
                {product.riskNote && <div className="drawer-issue"><ShieldAlert size={15} />{product.riskNote}</div>}
              </>}
        </DrawerSection>
      </aside>
    </div>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="drawer-section"><h3>{title}</h3>{children}</section>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="detail-row"><span>{label}</span><strong>{value}</strong></div>;
}
