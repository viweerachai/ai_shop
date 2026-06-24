import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface ImportMetadataEntry {
  kind: "sales_orders" | "stock_updates" | "product_imports";
  sourceLabel: string;
  importedAt: string;
  rowCount: number;
}

type ImportMetadataState = {
  latest: Partial<Record<ImportMetadataEntry["kind"], ImportMetadataEntry>>;
};

const defaultPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../.runtime/import-metadata.json"
);

export class ImportMetadataStore {
  constructor(private readonly filePath = defaultPath) {}

  private readState(): ImportMetadataState {
    if (!existsSync(this.filePath)) {
      return { latest: {} };
    }

    try {
      const raw = JSON.parse(readFileSync(this.filePath, "utf8")) as Partial<ImportMetadataState>;
      return { latest: raw.latest ?? {} };
    } catch {
      return { latest: {} };
    }
  }

  private writeState(state: ImportMetadataState): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(state, null, 2));
  }

  set(entry: ImportMetadataEntry): void {
    const state = this.readState();
    state.latest[entry.kind] = entry;
    this.writeState(state);
  }

  get(kind: ImportMetadataEntry["kind"]): ImportMetadataEntry | undefined {
    return this.readState().latest[kind];
  }

  latest(): Partial<Record<ImportMetadataEntry["kind"], ImportMetadataEntry>> {
    return this.readState().latest;
  }

  clear(): void {
    this.writeState({ latest: {} });
  }
}

export const importMetadataStore = new ImportMetadataStore();
