import { z } from "zod";

const booleanish = z.union([z.boolean(), z.string()]).transform((value) => {
  if (typeof value === "boolean") return value;
  return ["true", "yes", "1", "y"].includes(value.toLowerCase());
});

const trendLevel = z.preprocess(
  (value) => value === "" || value === null || value === undefined ? "medium" : value,
  z.enum(["low", "medium", "high"])
);

export const trendSignalSchema = z.object({
  trend_id: z.string(),
  keyword: z.string().default(""),
  category: z.string().default(""),
  related_sku: z.string().default(""),
  trend_level: trendLevel.default("medium"),
  source: z.string().default("owner"),
  note: z.string().default(""),
  start_date: z.string().default(""),
  end_date: z.string().default(""),
  active: booleanish.default(true),
  created_at: z.string().default(""),
  updated_at: z.string().default("")
});

export type TrendSignal = z.infer<typeof trendSignalSchema>;
