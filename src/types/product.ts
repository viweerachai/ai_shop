import { z } from "zod";

const booleanish = z.union([z.boolean(), z.string()]).transform((value) => {
  if (typeof value === "boolean") return value;
  return ["true", "yes", "1", "y"].includes(value.toLowerCase());
});

const numberish = z.union([z.number(), z.string(), z.null()]).transform((value) => {
  if (value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
});

export const rawProductSchema = z.object({
  product_id: z.string(),
  sku: z.string(),
  source_name: z.string().default(""),
  source_description: z.string().default(""),
  source_category: z.string().default(""),
  source_price: numberish.default(null),
  cost_price: numberish.default(null),
  selling_price: numberish.default(null),
  stock: numberish.default(null),
  image_url_1: z.string().default(""),
  image_url_2: z.string().default(""),
  image_url_3: z.string().default(""),
  product_url: z.string().default(""),
  note: z.string().default(""),
  status: z.string().default(""),
  created_at: z.string().default(""),
  updated_at: z.string().default("")
});

export const processedProductSchema = z.object({
  product_id: z.string(),
  sku: z.string(),
  title_th: z.string().default(""),
  short_description: z.string().default(""),
  long_description: z.string().default(""),
  keywords: z.string().default(""),
  category: z.string().default(""),
  product_type: z.string().default(""),
  is_blind_box: booleanish.default(false),
  is_preorder: booleanish.default(false),
  is_new_arrival: booleanish.default(false),
  arrival_date: z.string().default(""),
  stock: numberish.default(null),
  cost_price: numberish.default(null),
  selling_price: numberish.default(null),
  margin_percent: numberish.default(null),
  publish_priority: numberish.default(0),
  launch_post_needed: booleanish.default(false),
  launch_post_done: booleanish.default(false),
  available_assets: z.string().default(""),
  asset_note: z.string().default(""),
  can_make_unboxing: booleanish.default(false),
  can_make_review: booleanish.default(false),
  can_make_product_showcase: booleanish.default(true),
  content_used_count: numberish.default(0),
  last_content_date: z.string().default(""),
  risk_level: z.string().default("low"),
  risk_note: z.string().default(""),
  status: z.string().default(""),
  created_at: z.string().default(""),
  updated_at: z.string().default("")
});

export type RawProduct = z.infer<typeof rawProductSchema>;
export type ProcessedProduct = z.infer<typeof processedProductSchema>;
