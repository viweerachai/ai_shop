import { basename, resolve } from "node:path";
import { inflateRawSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import { createRepos } from "../sheets/repos.js";
import { ProcessedProduct, RawProduct } from "../types/product.js";
import { ProductAsset } from "../types/productAsset.js";
import { SalesOrder } from "../types/salesOrder.js";
import { ImportMetadataStore, importMetadataStore } from "../runtime/importMetadataStore.js";
import { nowIso } from "../utils/date.js";

type CsvRow = Record<string, string>;
type BigSellerSkuRow = Record<string, string>;
type StockImportRow = {
  sku: string;
  stock?: number | string | null;
  cost_price?: number | string | null;
  selling_price?: number | string | null;
};

type ZipEntry = {
  name: string;
  compression: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};
type SalesOrderImportRow = {
  order_id: string;
  ordered_at?: string;
  sku?: string;
  product_name?: string;
  quantity?: number | string;
  net_sales?: number | string;
  channel?: string;
  order_status?: string;
  note?: string;
};

function parseCsv(content: string): CsvRow[] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current.trim());
      current = "";
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }

  if (rows.length === 0) return [];
  const [headers = [], ...data] = rows;
  const normalizedHeaders = headers.map((header) => header.trim().toLowerCase());
  return data.map((cells) =>
    Object.fromEntries(normalizedHeaders.map((header, index) => [header, cells[index] ?? ""]))
  );
}

function readUInt16(buffer: Buffer, offset: number): number {
  return buffer.readUInt16LE(offset);
}

function readUInt32(buffer: Buffer, offset: number): number {
  return buffer.readUInt32LE(offset);
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const signature = 0x06054b50;
  const minOffset = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (readUInt32(buffer, offset) === signature) return offset;
  }
  throw new Error("Invalid XLSX file: ZIP central directory was not found.");
}

function listZipEntries(buffer: Buffer): ZipEntry[] {
  const eocd = findEndOfCentralDirectory(buffer);
  const totalEntries = readUInt16(buffer, eocd + 10);
  let offset = readUInt32(buffer, eocd + 16);
  const entries: ZipEntry[] = [];

  for (let index = 0; index < totalEntries; index += 1) {
    if (readUInt32(buffer, offset) !== 0x02014b50) {
      throw new Error("Invalid XLSX file: central directory entry is malformed.");
    }
    const compression = readUInt16(buffer, offset + 10);
    const compressedSize = readUInt32(buffer, offset + 20);
    const uncompressedSize = readUInt32(buffer, offset + 24);
    const fileNameLength = readUInt16(buffer, offset + 28);
    const extraLength = readUInt16(buffer, offset + 30);
    const commentLength = readUInt16(buffer, offset + 32);
    const localHeaderOffset = readUInt32(buffer, offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + fileNameLength);
    entries.push({ name, compression, compressedSize, uncompressedSize, localHeaderOffset });
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

function readZipEntry(buffer: Buffer, entry: ZipEntry): Buffer {
  const offset = entry.localHeaderOffset;
  if (readUInt32(buffer, offset) !== 0x04034b50) {
    throw new Error(`Invalid XLSX file: local header is malformed for ${entry.name}.`);
  }
  const fileNameLength = readUInt16(buffer, offset + 26);
  const extraLength = readUInt16(buffer, offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);
  if (entry.compression === 0) return Buffer.from(compressed);
  if (entry.compression === 8) return inflateRawSync(compressed);
  throw new Error(`Unsupported XLSX compression method ${entry.compression} in ${entry.name}.`);
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)));
}

function columnIndex(cellRef: string): number {
  const letters = cellRef.replace(/[^A-Za-z]/g, "");
  let index = 0;
  for (const letter of letters) {
    index = index * 26 + letter.toUpperCase().charCodeAt(0) - 64;
  }
  return index - 1;
}

function extractTag(xml: string, tagName: string): string {
  const match = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i").exec(xml);
  return match?.[1] ? decodeXml(match[1]) : "";
}

function parseSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/gi)].map((match) => {
    const sharedStringBody = match[1] ?? "";
    const textParts = [...sharedStringBody.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)]
      .map((part) => decodeXml(part[1] ?? ""));
    return textParts.join("");
  });
}

function parseWorksheetRows(xml: string, sharedStrings: string[]): string[][] {
  const rows: string[][] = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/gi)) {
    const cells: Record<number, string> = {};
    const rowBody = rowMatch[1] ?? "";
    for (const cellMatch of rowBody.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gi)) {
      const attrs = cellMatch[1] ?? "";
      const body = cellMatch[2] ?? "";
      const ref = /\br="([^"]+)"/i.exec(attrs)?.[1] ?? "";
      const type = /\bt="([^"]+)"/i.exec(attrs)?.[1] ?? "";
      const index = columnIndex(ref);
      let text = "";
      if (type === "inlineStr") {
        text = [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)]
          .map((part) => decodeXml(part[1] ?? ""))
          .join("");
      } else {
        text = extractTag(body, "v");
        if (type === "s") {
          text = sharedStrings[Number(text)] ?? "";
        }
      }
      cells[index] = text.trim();
    }
    if (Object.keys(cells).length > 0) {
      const max = Math.max(...Object.keys(cells).map(Number));
      rows.push(Array.from({ length: max + 1 }, (_, index) => cells[index] ?? ""));
    }
  }
  return rows;
}

async function parseXlsxFirstSheet(filePath: string): Promise<CsvRow[]> {
  const buffer = await readFile(resolve(filePath));
  const entries = listZipEntries(buffer);
  const byName = new Map(entries.map((entry) => [entry.name, entry]));
  const sheetEntry = byName.get("xl/worksheets/sheet1.xml");
  if (!sheetEntry) throw new Error("XLSX file does not contain xl/worksheets/sheet1.xml.");
  const sharedStringEntry = byName.get("xl/sharedStrings.xml");
  const sharedStrings = sharedStringEntry
    ? parseSharedStrings(readZipEntry(buffer, sharedStringEntry).toString("utf8"))
    : [];
  const rows = parseWorksheetRows(readZipEntry(buffer, sheetEntry).toString("utf8"), sharedStrings);
  if (rows.length === 0) return [];
  const [headers = [], ...data] = rows;
  return data
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header.trim().toLowerCase(), row[index] ?? ""])));
}

function value(row: CsvRow, aliases: string[]): string {
  for (const alias of aliases) {
    const match = row[alias.toLowerCase()];
    if (match !== undefined && match !== "") return match;
  }
  return "";
}

function nullableNumber(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/,/g, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function normalizeStock(raw: string): number | null {
  const value = nullableNumber(raw);
  return value === null ? null : Math.max(0, Math.floor(value));
}

function cleanCategory(value: string): string {
  const trimmed = value.trim();
  return !trimmed || trimmed === "ไม่มีหมวดหมู่" ? "" : trimmed;
}

function productIdFromSku(sku: string): string {
  return `raw_${sku.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`;
}

function numericOrZero(raw: string): number {
  return nullableNumber(raw) ?? 0;
}

export function salesSourceLabel(store: ImportMetadataStore = importMetadataStore): string {
  const latest = store.get("sales_orders");
  return latest?.sourceLabel ?? "sales_orders";
}

function normalizeSalesOrders(rows: CsvRow[]): SalesOrder[] {
  return rows.map((row, index) => {
    const orderId = value(row, ["order_id", "orderid", "id", "order number", "order_no"]);
    if (!orderId) {
      throw new Error(`Row ${index + 2} is missing order_id.`);
    }
    return {
      order_id: orderId,
      ordered_at: value(row, ["ordered_at", "orderedat", "order_date", "date", "created_at"]),
      sku: value(row, ["sku", "product_sku"]),
      product_name: value(row, ["product_name", "product", "title", "name"]),
      quantity: numericOrZero(value(row, ["quantity", "qty", "units"])),
      net_sales: numericOrZero(value(row, ["net_sales", "net", "revenue", "amount", "sales"])),
      channel: value(row, ["channel", "platform", "source"]),
      order_status: value(row, ["order_status", "status", "payment_status"]) || "paid",
      note: value(row, ["note", "notes", "remark"])
    };
  });
}

export async function ingestSalesOrders(
  orders: SalesOrder[],
  sourceLabel: string
): Promise<{ imported: number; sourceLabel: string }> {
  const repos = createRepos();
  await repos.salesOrders.upsert(orders);
  importMetadataStore.set({
    kind: "sales_orders",
    sourceLabel,
    importedAt: nowIso(),
    rowCount: orders.length
  });
  return { imported: orders.length, sourceLabel };
}

export async function importSalesOrdersCsv(filePath: string): Promise<{ imported: number; sourceLabel: string }> {
  const content = await import("node:fs/promises").then((fs) => fs.readFile(resolve(filePath), "utf8"));
  const rows = parseCsv(content);
  const orders = normalizeSalesOrders(rows);
  return ingestSalesOrders(orders, `sales_orders csv: ${basename(filePath)}`);
}

export async function importSalesOrdersJson(
  rows: SalesOrderImportRow[],
  sourceLabel = "sales_orders api"
): Promise<{ imported: number; sourceLabel: string }> {
  const orders = rows.map((row, index) => {
    const orderId = row.order_id?.trim();
    if (!orderId) {
      throw new Error(`Row ${index + 1} is missing order_id.`);
    }
    return {
      order_id: orderId,
      ordered_at: row.ordered_at ?? "",
      sku: row.sku ?? "",
      product_name: row.product_name ?? "",
      quantity: numericOrZero(String(row.quantity ?? "")),
      net_sales: numericOrZero(String(row.net_sales ?? "")),
      channel: row.channel ?? "",
      order_status: row.order_status ?? "paid",
      note: row.note ?? ""
    };
  });
  return ingestSalesOrders(orders, sourceLabel);
}

function normalizeBigSellerRows(rows: BigSellerSkuRow[]): {
  rawProducts: RawProduct[];
  productAssets: ProductAsset[];
  skipped: number;
  missingSellingPrice: number;
  missingImage: number;
} {
  const now = nowIso();
  const rawProducts: RawProduct[] = [];
  const productAssets: ProductAsset[] = [];
  let skipped = 0;
  let missingSellingPrice = 0;
  let missingImage = 0;

  for (const row of rows) {
    const sku = value(row, ["เลข sku", "sku", "merchant sku", "seller sku"]).trim();
    const name = value(row, ["ชื่อ sku", "name", "product name", "ชื่อสินค้า"]).trim();
    if (!sku || !name) {
      skipped += 1;
      continue;
    }

    const imageUrl = value(row, ["image url", "image_url", "รูปภาพ"]).trim();
    const sellingPrice = nullableNumber(value(row, ["อ้างอิงราคาขาย", "selling_price", "price", "sale price"]));
    if (sellingPrice === null || sellingPrice === 0) missingSellingPrice += 1;
    if (!imageUrl) missingImage += 1;

    const sourceProductId = value(row, ["รหัสสินค้า", "product id", "product_id"]).trim();
    const merchantNote = value(row, ["หมายเหตุ sku merchant", "note", "หมายเหตุ"]).trim();
    const skuType = value(row, ["ประเภทsku", "sku type"]).trim();
    const createdAt = value(row, ["เวลาสร้าง", "created_at", "created time"]).trim();
    const noteParts = [
      "Imported from BigSeller SKU Excel",
      sourceProductId ? `source_product_id=${sourceProductId}` : "",
      skuType ? `sku_type=${skuType}` : "",
      merchantNote ? `merchant_note=${merchantNote}` : "",
      createdAt ? `source_created_at=${createdAt}` : ""
    ].filter(Boolean);

    rawProducts.push({
      product_id: productIdFromSku(sku),
      sku,
      source_name: name,
      source_description: "",
      source_category: cleanCategory(value(row, ["หมวดหมู่", "category"])),
      source_price: sellingPrice,
      cost_price: nullableNumber(value(row, ["อ้างอิงราคาต้นทุน", "cost_price", "cost"])),
      selling_price: sellingPrice,
      stock: normalizeStock(value(row, ["สต็อกที่มีอยู่ทั้งหมด", "stock", "available stock"])),
      image_url_1: imageUrl,
      image_url_2: "",
      image_url_3: "",
      product_url: "",
      note: noteParts.join(" | "),
      status: "new",
      created_at: now,
      updated_at: now
    });

    productAssets.push({
      sku,
      product_name: name,
      drive_folder_id: "",
      drive_folder_url: "",
      asset_note: imageUrl ? `BigSeller image_url=${imageUrl}` : "No BigSeller image URL",
      created_at: now,
      updated_at: now
    });
  }

  return { rawProducts, productAssets, skipped, missingSellingPrice, missingImage };
}

export async function importBigSellerSkuExcel(filePath: string): Promise<{
  importedRaw: number;
  importedAssets: number;
  skipped: number;
  missingSellingPrice: number;
  missingImage: number;
  sourceLabel: string;
}> {
  const rows = await parseXlsxFirstSheet(filePath);
  const normalized = normalizeBigSellerRows(rows);
  const repos = createRepos();

  if (normalized.rawProducts.length > 0) {
    await repos.rawProducts.upsert(normalized.rawProducts);
  }
  if (normalized.productAssets.length > 0) {
    await repos.productAssets.upsert(normalized.productAssets);
  }

  const sourceLabel = `BigSeller SKU Excel: ${basename(filePath)}`;
  importMetadataStore.set({
    kind: "product_imports",
    sourceLabel,
    importedAt: nowIso(),
    rowCount: normalized.rawProducts.length
  });

  return {
    importedRaw: normalized.rawProducts.length,
    importedAssets: normalized.productAssets.length,
    skipped: normalized.skipped,
    missingSellingPrice: normalized.missingSellingPrice,
    missingImage: normalized.missingImage,
    sourceLabel
  };
}

async function ingestStockUpdates(
  rows: StockImportRow[],
  sourceLabel: string,
  totalRows: number
): Promise<{ updatedRaw: number; updatedProcessed: number; sourceLabel: string }> {
  const repos = createRepos();
  const [rawProducts, processedProducts] = await Promise.all([
    repos.rawProducts.all(),
    repos.processedProducts.all()
  ]);

  const rawBySku = new Map(rawProducts.map((item) => [item.sku, item]));
  const processedBySku = new Map(processedProducts.map((item) => [item.sku, item]));

  const rawUpdates: RawProduct[] = [];
  const processedUpdates: ProcessedProduct[] = [];

  for (const row of rows) {
    const sku = row.sku.trim();
    if (!sku) continue;

    const stock = nullableNumber(String(row.stock ?? ""));
    const costPrice = nullableNumber(String(row.cost_price ?? ""));
    const sellingPrice = nullableNumber(String(row.selling_price ?? ""));
    const updatedAt = nowIso();

    const raw = rawBySku.get(sku);
    if (raw) {
      rawUpdates.push({
        ...raw,
        stock,
        cost_price: costPrice ?? raw.cost_price,
        selling_price: sellingPrice ?? raw.selling_price,
        updated_at: updatedAt
      });
    }

    const processed = processedBySku.get(sku);
    if (processed) {
      const nextCost = costPrice ?? processed.cost_price;
      const nextSelling = sellingPrice ?? processed.selling_price;
      const marginPercent =
        nextCost !== null && nextSelling !== null && nextSelling > 0
          ? Number((((nextSelling - nextCost) / nextSelling) * 100).toFixed(2))
          : processed.margin_percent;
      processedUpdates.push({
        ...processed,
        stock,
        cost_price: nextCost,
        selling_price: nextSelling,
        margin_percent: marginPercent,
        updated_at: updatedAt
      });
    }
  }

  if (rawUpdates.length > 0) await repos.rawProducts.upsert(rawUpdates);
  if (processedUpdates.length > 0) await repos.processedProducts.upsert(processedUpdates);

  importMetadataStore.set({
    kind: "stock_updates",
    sourceLabel,
    importedAt: nowIso(),
    rowCount: totalRows
  });
  return { updatedRaw: rawUpdates.length, updatedProcessed: processedUpdates.length, sourceLabel };
}

export async function importStockCsv(filePath: string): Promise<{ updatedRaw: number; updatedProcessed: number; sourceLabel: string }> {
  const content = await import("node:fs/promises").then((fs) => fs.readFile(resolve(filePath), "utf8"));
  const rows = parseCsv(content);
  const normalized = rows.map((row) => ({
    sku: value(row, ["sku", "product_sku"]),
    stock: value(row, ["stock", "qty_on_hand", "available_stock"]),
    cost_price: value(row, ["cost_price", "cost", "unit_cost"]),
    selling_price: value(row, ["selling_price", "price", "sale_price"])
  }));
  return ingestStockUpdates(normalized, `stock csv: ${basename(filePath)}`, rows.length);
}

export async function importStockJson(
  rows: StockImportRow[],
  sourceLabel = "stock api"
): Promise<{ updatedRaw: number; updatedProcessed: number; sourceLabel: string }> {
  return ingestStockUpdates(rows, sourceLabel, rows.length);
}
