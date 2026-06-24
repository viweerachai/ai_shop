import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { config, requireAnthropicApiKey } from "../config.js";
import { logger } from "../utils/logger.js";
import { parseAiJson } from "./jsonExtractor.js";
import { JsonAiClient } from "./jsonAiClient.js";

function describeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
  if (typeof error === "object" && error !== null) {
    return {
      type: "object",
      value: error
    };
  }
  return {
    type: typeof error,
    value: error
  };
}

export class ClaudeClient implements JsonAiClient {
  private readonly client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: requireAnthropicApiKey() });
  }

  async generateJson<T>(
    prompt: string,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    attempts = 3
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const message = await this.client.messages.create({
          model: config.anthropicModel,
          max_tokens: 2400,
          temperature: 0.35,
          system: "Return only one compact, complete JSON object. Do not use markdown fences, explanations, or trailing commentary.",
          messages: [{ role: "user", content: prompt }]
        });
        const text = message.content
          .filter((item): item is Anthropic.TextBlock => item.type === "text")
          .map((item) => item.text)
          .join("\n");
        return parseAiJson(text, schema);
      } catch (error) {
        lastError = error;
        logger.warn(
          {
            attempt,
            error: describeError(error)
          },
          "Claude request failed; retrying"
        );
        if (attempt < attempts) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }
    }
    throw lastError;
  }
}
