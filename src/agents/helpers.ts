import { z } from "zod";
import { loadAgentContext } from "../ai/contextLoader.js";
import { JsonAiClient } from "../ai/jsonAiClient.js";
import { buildPrompt } from "../ai/promptBuilder.js";
import { Repos } from "../sheets/repos.js";
import { agentLogStore } from "../runtime/agentLogStore.js";
import { nowIso } from "../utils/date.js";

function safeStringify(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export async function runAgent<T>(
  repos: Repos,
  client: JsonAiClient,
  options: {
    promptName: string;
    ruleTypes: string[];
    input: unknown;
    schema: z.ZodType<T, z.ZodTypeDef, unknown>;
    outputShape: string;
  }
): Promise<T> {
  const context = await loadAgentContext(repos, options.ruleTypes);
  const prompt = await buildPrompt(
    options.promptName,
    options.input,
    context,
    options.outputShape
  );
  const startedAt = nowIso();
  const startedAtMs = Date.now();
  const wrappedClient: JsonAiClient = {
    async generateJson<R>(
      finalPrompt: string,
      schema: z.ZodType<R, z.ZodTypeDef, unknown>,
      attempts?: number
    ): Promise<R> {
      let rawResponse = "";
      const captureSchema = schema.transform((value) => {
        rawResponse = safeStringify(value);
        return value;
      });
      try {
        const result = await client.generateJson(finalPrompt, captureSchema, attempts);
        agentLogStore.record({
          promptName: options.promptName,
          status: "success",
          startedAt,
          finishedAt: nowIso(),
          durationMs: Date.now() - startedAtMs,
          prompt: finalPrompt,
          response: rawResponse,
          input: options.input,
          result
        });
        return result;
      } catch (error) {
        agentLogStore.record({
          promptName: options.promptName,
          status: "failed",
          startedAt,
          finishedAt: nowIso(),
          durationMs: Date.now() - startedAtMs,
          prompt: finalPrompt,
          response: rawResponse,
          input: options.input,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }
  };
  return wrappedClient.generateJson(prompt, options.schema);
}
