import { z } from "zod";
import { config } from "../config.js";
import { GeminiClient } from "../ai/geminiClient.js";

if (!config.hasGeminiCredentials) {
  throw new Error("GEMINI_API_KEY is not configured.");
}
const result = await new GeminiClient().generateJson(
  'Return exactly {"ok":true} as JSON.',
  z.object({ ok: z.literal(true) })
);
console.log("Gemini connection OK.", result);
