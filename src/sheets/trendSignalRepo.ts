import { BaseSheetRepo } from "./baseRepo.js";
import { GoogleSheetsClient } from "./googleSheetsClient.js";
import { TrendSignal, trendSignalSchema } from "../types/trendSignal.js";

export class TrendSignalRepo extends BaseSheetRepo<TrendSignal> {
  constructor(client: GoogleSheetsClient) {
    super(client, "trend_signals", "trend_id", trendSignalSchema);
  }

  async active(): Promise<TrendSignal[]> {
    const now = new Date();
    return this.where((signal) => {
      if (!signal.active) return false;
      const start = signal.start_date ? new Date(signal.start_date) : null;
      const end = signal.end_date ? new Date(signal.end_date) : null;
      if (start && Number.isFinite(start.getTime()) && start > now) return false;
      if (end && Number.isFinite(end.getTime()) && end < now) return false;
      return true;
    });
  }
}
