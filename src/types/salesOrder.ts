import { z } from "zod";

const numberish = z.union([z.number(), z.string(), z.null()]).transform((value) => {
  if (value === null || value === "") return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
});

export const salesOrderSchema = z.object({
  order_id: z.string(),
  ordered_at: z.string().default(""),
  sku: z.string().default(""),
  product_name: z.string().default(""),
  quantity: numberish.default(0),
  net_sales: numberish.default(0),
  channel: z.string().default(""),
  order_status: z.string().default(""),
  note: z.string().default("")
});

export type SalesOrder = z.infer<typeof salesOrderSchema>;
