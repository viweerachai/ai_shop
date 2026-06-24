import { config } from "../config.js";
import { createRepos } from "../sheets/repos.js";
import { DriveAssetFile, ProductAsset, ProductAssetView } from "../types/productAsset.js";
import { ProcessedProduct } from "../types/product.js";

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9ก-๙]+/gi, " ");
}

function classifyDriveFile(file: DriveAssetFile): string[] {
  const name = normalizeToken(file.name);
  const mime = file.mimeType.toLowerCase();
  const labels = new Set<string>();

  if (mime.startsWith("video/") || /\b(video|mp4|mov|reel|clip)\b/.test(name)) {
    labels.add("video");
  }
  if (/\b(opened|unbox|unboxing|opened photo)\b/.test(name)) {
    labels.add("opened_photo");
  }
  if (/\b(thumb|thumbnail)\b/.test(name)) {
    labels.add("thumbnail");
  }
  if (/\b(box|sealed|pack|package)\b/.test(name)) {
    labels.add("box_photo");
  }
  if (/\b(template|layout|mockup)\b/.test(name)) {
    labels.add("template");
  }
  if (mime.startsWith("image/") || /\b(image|photo|product|main|shot)\b/.test(name)) {
    labels.add(labels.has("opened_photo") || labels.has("box_photo") ? "product_photo" : "product_photo");
  }
  if (labels.size === 0) {
    labels.add(mime.startsWith("image/") ? "product_photo" : "reference");
  }
  return [...labels];
}

function toDriveAssetFile(file: any): DriveAssetFile {
  return {
    id: file.id ?? "",
    name: file.name ?? "",
    mimeType: file.mimeType ?? "",
    webViewLink: file.webViewLink ?? "",
    webContentLink: file.webContentLink ?? "",
    thumbnailLink: file.thumbnailLink ?? "",
    modifiedTime: file.modifiedTime ?? ""
  };
}

function mergeAssetLabels(sheetAssets: string[], driveAssets: string[]): string[] {
  return [...new Set([...sheetAssets, ...driveAssets].filter(Boolean))];
}

function normalizeFolderKey(value: string): string {
  return value.trim().toLowerCase();
}

function isImageFile(file: DriveAssetFile): boolean {
  return file.mimeType.toLowerCase().startsWith("image/");
}

function bestImageUrlFromFiles(files: DriveAssetFile[]): string {
  const image = files.find((file) => isImageFile(file));
  return image?.id ? `/api/drive/files/${encodeURIComponent(image.id)}/image` : "";
}

async function loadSkuFolderMap(repos: ReturnType<typeof createRepos>): Promise<Map<string, DriveAssetFile>> {
  if (!config.googleDriveFolderId) return new Map();
  try {
    const folders = await repos.client.listDriveFoldersInFolder(config.googleDriveFolderId);
    return new Map(
      folders
        .map(toDriveAssetFile)
        .map((folder) => [normalizeFolderKey(folder.name), folder])
    );
  } catch (error) {
    console.warn(
      `[productAssetService] Drive SKU folder scan failed. Reason: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return new Map();
  }
}

function resolveSkuDriveFolder(row: ProductAsset, skuFolderMap: Map<string, DriveAssetFile>): {
  folderId: string;
  folderUrl: string;
  note: string;
} {
  const sheetFolderId = row.drive_folder_id.trim();
  if (sheetFolderId) {
    return {
      folderId: sheetFolderId,
      folderUrl: row.drive_folder_url || `https://drive.google.com/drive/folders/${sheetFolderId}`,
      note: ""
    };
  }
  const skuFolder = skuFolderMap.get(normalizeFolderKey(row.sku));
  if (!skuFolder) {
    return { folderId: "", folderUrl: "", note: config.googleDriveFolderId ? "No SKU-named Drive folder found" : "" };
  }
  return {
    folderId: skuFolder.id,
    folderUrl: skuFolder.webViewLink || `https://drive.google.com/drive/folders/${skuFolder.id}`,
    note: `Resolved Drive folder by SKU name: ${skuFolder.name}`
  };
}

function productAssetRowFromProduct(product: ProcessedProduct): ProductAsset {
  return {
    sku: product.sku,
    product_name: product.title_th || product.sku,
    drive_folder_id: "",
    drive_folder_url: "",
    asset_note: "",
    created_at: product.created_at,
    updated_at: product.updated_at
  };
}

export async function loadProductAssetViews(): Promise<ProductAssetView[]> {
  if (!config.hasGoogleCredentials) return [];
  let rows: ProductAsset[];
  let products: ProcessedProduct[];
  let repos: ReturnType<typeof createRepos>;
  try {
    repos = createRepos();
    [rows, products] = await Promise.all([
      repos.productAssets.all(),
      repos.processedProducts.all()
    ]);
  } catch (error) {
    console.warn(
      `[productAssetService] live data failed, returning empty asset list. Reason: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return [];
  }
  const productBySku = new Map(products.map((product: ProcessedProduct) => [product.sku, product]));
  const rowsBySku = new Map(rows.map((row) => [row.sku, row]));
  const mergedRows = [
    ...rows,
    ...products
      .filter((product) => product.sku && !rowsBySku.has(product.sku))
      .map(productAssetRowFromProduct)
  ];
  const skuFolderMap = await loadSkuFolderMap(repos);

  const views = await Promise.all(mergedRows.map(async (row: ProductAsset) => {
    const resolvedFolder = resolveSkuDriveFolder(row, skuFolderMap);
    const folderId = resolvedFolder.folderId;
    let files: DriveAssetFile[] = [];
    let driveNote = "";
    if (folderId) {
      try {
        files = (await repos.client.listDriveFilesInFolder(folderId)).map(toDriveAssetFile);
      } catch (error) {
        driveNote = error instanceof Error ? error.message : "Drive folder access failed";
      }
    }
    const driveAssets = files.flatMap(classifyDriveFile);
    const product = productBySku.get(row.sku);
    const sheetAssets = (product?.available_assets || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return {
      sku: row.sku,
      productName: row.product_name || product?.title_th || row.sku,
      driveFolderId: folderId,
      driveFolderUrl: resolvedFolder.folderUrl,
      assetNote: [row.asset_note, product?.asset_note, resolvedFolder.note, driveNote].filter(Boolean).join(" | "),
      assetCount: files.length,
      availableAssets: mergeAssetLabels(sheetAssets, driveAssets),
      files,
      updatedAt: row.updated_at || product?.updated_at || "",
      source: files.length ? "drive" : folderId ? "sheet" : "fallback"
    } satisfies ProductAssetView;
  }));

  return views.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function loadProductAssetMap(): Promise<Map<string, ProductAssetView>> {
  const views = await loadProductAssetViews();
  return new Map(views.map((view) => [view.sku, view]));
}

export function productAssetImageUrl(asset?: ProductAssetView): string {
  return asset ? bestImageUrlFromFiles(asset.files) : "";
}
