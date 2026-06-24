import { z } from "zod";
import { ClaudeClient } from "../ai/claudeClient.js";
import { config } from "../config.js";

if (!config.hasAnthropicCredentials) {
  throw new Error("ANTHROPIC_API_KEY is not configured.");
}
const result = await new ClaudeClient().generateJson(
  'Return exactly {"ok":true} as JSON.',
  z.object({ ok: z.literal(true) })
);
console.log("Claude connection OK.", result);
