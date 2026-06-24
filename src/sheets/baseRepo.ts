import { z } from "zod";
import { GoogleSheetsClient, SheetRow } from "./googleSheetsClient.js";
import { SheetName } from "./sheetDefinitions.js";

export class BaseSheetRepo<T extends SheetRow> {
  constructor(
    private readonly client: GoogleSheetsClient,
    private readonly sheetName: SheetName,
    private readonly keyColumn: keyof T & string,
    private readonly schema: z.ZodType<T, z.ZodTypeDef, unknown>
  ) {}

  async all(): Promise<T[]> {
    const rows = await this.client.getRows(this.sheetName);
    return rows.map((row) => this.schema.parse(row));
  }

  async where(predicate: (row: T) => boolean): Promise<T[]> {
    return (await this.all()).filter(predicate);
  }

  async upsert(rows: T[]): Promise<void> {
    await this.client.upsertRows(this.sheetName, this.keyColumn, rows);
  }

  async append(rows: T[]): Promise<void> {
    await this.client.appendRows(this.sheetName, rows);
  }
}
