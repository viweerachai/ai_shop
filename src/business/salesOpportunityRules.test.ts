import { describe, expect, it } from "vitest";
import { deriveProductSalesSignals } from "./salesOpportunityRules.js";

describe("sales opportunity rules", () => {
  it("marks fast-selling low-stock products as restock risk", () => {
    const signals = deriveProductSalesSignals(
      { stock: 4, isNewArrival: true },
      { units7d: 4, units30d: 9, revenue30d: 7200, orders30d: 4 }
    );

    expect(signals.status).toBe("restock_risk");
    expect(signals.labels).toEqual(expect.arrayContaining(["Top seller", "Restock risk"]));
  });

  it("marks high-stock low-sales products as slow movers", () => {
    const signals = deriveProductSalesSignals(
      { stock: 16, isNewArrival: false },
      { units7d: 0, units30d: 1, revenue30d: 790, orders30d: 1 }
    );

    expect(signals.status).toBe("slow_mover");
    expect(signals.recommendedAction).toContain("bundle");
  });
});
