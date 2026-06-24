import { ProcessedProduct } from "../types/product.js";
import { TrendSignal } from "../types/trendSignal.js";

export type ProductTrendInsight = {
  score: number;
  level: "none" | "low" | "medium" | "high";
  labels: string[];
  notes: string[];
  matchedSignals: TrendSignal[];
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9ก-๙]+/gi, " ").trim();
}

function levelScore(level: TrendSignal["trend_level"]): number {
  if (level === "high") return 52;
  if (level === "medium") return 30;
  return 14;
}

function strongestLevel(signals: TrendSignal[]): ProductTrendInsight["level"] {
  if (signals.some((signal) => signal.trend_level === "high")) return "high";
  if (signals.some((signal) => signal.trend_level === "medium")) return "medium";
  if (signals.some((signal) => signal.trend_level === "low")) return "low";
  return "none";
}

function matchesProduct(product: ProcessedProduct, signal: TrendSignal): boolean {
  const relatedSku = signal.related_sku.trim();
  if (relatedSku && relatedSku === product.sku) return true;

  const category = normalize(signal.category);
  if (category && normalize(`${product.category} ${product.product_type}`).includes(category)) return true;

  const keyword = normalize(signal.keyword);
  if (!keyword) return false;
  const productText = normalize([
    product.sku,
    product.title_th,
    product.category,
    product.product_type,
    product.keywords,
    product.short_description
  ].join(" "));
  return productText.includes(keyword);
}

export function trendInsightForProduct(
  product: ProcessedProduct,
  signals: TrendSignal[] = []
): ProductTrendInsight {
  const matchedSignals = signals.filter((signal) => matchesProduct(product, signal));
  const score = matchedSignals.reduce((sum, signal) => sum + levelScore(signal.trend_level), 0);
  return {
    score: Math.min(score, 80),
    level: strongestLevel(matchedSignals),
    labels: matchedSignals.map((signal) => `${signal.keyword || signal.category || signal.related_sku} (${signal.trend_level})`).slice(0, 3),
    notes: matchedSignals.map((signal) => signal.note).filter(Boolean).slice(0, 3),
    matchedSignals
  };
}

export function summarizeTrendSignals(signals: TrendSignal[] = []): string[] {
  return signals
    .slice(0, 8)
    .map((signal) => {
      const target = signal.related_sku || signal.keyword || signal.category || "trend";
      return `${target}: ${signal.trend_level}${signal.note ? ` - ${signal.note}` : ""}`;
    });
}
