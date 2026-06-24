import { z } from "zod";
import { extractJson } from "../utils/safeJson.js";

export function parseAiJson<T>(
  text: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>
): T {
  return schema.parse(extractJson(text));
}
