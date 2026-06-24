import { google, sheets_v4 } from "googleapis";
import { requireGoogleConfig } from "../config.js";
import { logger } from "../utils/logger.js";
import { SHEET_HEADERS, SheetName } from "./sheetDefinitions.js";

export type SheetRow = Record<string, string | number | boolean | null | undefined>;

const readCache = new Map<SheetName, { expiresAt: number; rows: SheetRow[] }>();
const READ_CACHE_MS = 30_000;

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function cloneRows<T extends SheetRow>(rows: T[]): T[] {
  return rows.map((row) => ({ ...row })) as T[];
}

function invalidateSheet(sheetName: SheetName): void {
  readCache.delete(sheetName);
}

export class GoogleSheetsClient {
  private readonly auth: InstanceType<typeof google.auth.JWT>;
  private readonly sheets: sheets_v4.Sheets;
  private readonly sheetId: string;

  constructor() {
    const credentials = requireGoogleConfig();
    this.auth = new google.auth.JWT({
      email: credentials.clientEmail,
      key: credentials.privateKey,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive.readonly"
      ]
    });
    this.sheets = google.sheets({ version: "v4", auth: this.auth });
    this.sheetId = credentials.sheetId;
  }

  private drive() {
    return google.drive({ version: "v3", auth: this.auth });
  }

  async ensureSheets(): Promise<void> {
    const metadata = await this.sheets.spreadsheets.get({ spreadsheetId: this.sheetId });
    const existing = new Set(metadata.data.sheets?.map((sheet) => sheet.properties?.title));
    const missing = Object.keys(SHEET_HEADERS).filter((name) => !existing.has(name));
    if (missing.length > 0) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.sheetId,
        requestBody: {
          requests: missing.map((title) => ({ addSheet: { properties: { title } } }))
        }
      });
    }
    for (const [name, headers] of Object.entries(SHEET_HEADERS)) {
      const current = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: `'${name}'!1:1`
      });
      const currentHeaders = (current.data.values?.[0] ?? []).map(String);
      if (!currentHeaders.length) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.sheetId,
          range: `'${name}'!A1`,
          valueInputOption: "RAW",
          requestBody: { values: [[...headers]] }
        });
      } else {
        const missingHeaders = headers.filter((header) => !currentHeaders.includes(header));
        if (missingHeaders.length > 0) {
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.sheetId,
            range: `'${name}'!A1`,
            valueInputOption: "RAW",
            requestBody: { values: [[...currentHeaders, ...missingHeaders]] }
          });
        }
      }
    }
    logger.info({ sheets: Object.keys(SHEET_HEADERS) }, "Google Sheets structure is ready");
  }

  async getRows<T extends SheetRow>(sheetName: SheetName): Promise<T[]> {
    const cached = readCache.get(sheetName);
    if (cached && cached.expiresAt > Date.now()) {
      return cloneRows(cached.rows as T[]);
    }
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: `'${sheetName}'!A:ZZ`
    });
    const [headers = [], ...rows] = response.data.values ?? [];
    const parsed = rows
      .filter((row) => row.some((value) => value !== ""))
      .map((row) =>
        Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]))
      ) as T[];
    readCache.set(sheetName, { expiresAt: Date.now() + READ_CACHE_MS, rows: cloneRows(parsed) });
    return parsed;
  }

  async appendRows(sheetName: SheetName, rows: SheetRow[]): Promise<void> {
    if (rows.length === 0) return;
    invalidateSheet(sheetName);
    const headers = SHEET_HEADERS[sheetName];
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.sheetId,
      range: `'${sheetName}'!A:ZZ`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: rows.map((row) => headers.map((header) => row[header] ?? "")) }
    });
  }

  async upsertRows(
    sheetName: SheetName,
    keyColumn: string,
    rows: SheetRow[]
  ): Promise<void> {
    if (rows.length === 0) return;
    invalidateSheet(sheetName);
    const existing = await this.getRows(sheetName);
    const headers = SHEET_HEADERS[sheetName];
    const rowIndexByKey = new Map(
      existing.map((row, index) => [String(row[keyColumn]), index + 2])
    );
    const updates: sheets_v4.Schema$ValueRange[] = [];
    const appends: SheetRow[] = [];

    for (const row of rows) {
      const rowIndex = rowIndexByKey.get(String(row[keyColumn]));
      if (rowIndex) {
        const previous = existing[rowIndex - 2] ?? {};
        const merged = { ...previous, ...row };
        updates.push({
          range: `'${sheetName}'!A${rowIndex}`,
          values: [headers.map((header) => merged[header] ?? "")]
        });
      } else {
        appends.push(row);
      }
    }
    if (updates.length > 0) {
      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.sheetId,
        requestBody: { valueInputOption: "USER_ENTERED", data: updates }
      });
    }
    await this.appendRows(sheetName, appends);
    invalidateSheet(sheetName);
  }

  async listDriveFilesInFolder(folderId: string) {
    if (!folderId) return [];
    const response = await this.drive().files.list({
      q: `'${escapeDriveQueryValue(folderId)}' in parents and trashed = false`,
      fields: "files(id,name,mimeType,webViewLink,webContentLink,thumbnailLink,modifiedTime)",
      orderBy: "modifiedTime desc",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    return response.data.files ?? [];
  }

  async listDriveFoldersInFolder(folderId: string) {
    if (!folderId) return [];
    const response = await this.drive().files.list({
      q: `'${escapeDriveQueryValue(folderId)}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`,
      fields: "files(id,name,mimeType,webViewLink,modifiedTime)",
      orderBy: "name",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    return response.data.files ?? [];
  }

  async getDriveFileMetadata(fileId: string) {
    const response = await this.drive().files.get({
      fileId,
      fields: "id,name,mimeType,size,modifiedTime",
      supportsAllDrives: true
    });
    return response.data;
  }

  async getDriveFileMedia(fileId: string) {
    const [metadata, media] = await Promise.all([
      this.getDriveFileMetadata(fileId),
      this.drive().files.get(
        { fileId, alt: "media", supportsAllDrives: true },
        { responseType: "stream" }
      )
    ]);
    return { metadata, stream: media.data };
  }
}
