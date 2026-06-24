import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { config, requireGeminiApiKey } from "../config.js";
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

function retryDelayMs(error: unknown): number | null {
  const message = error instanceof Error ? error.message : "";
  const retryMatch = message.match(/retry(?:Delay| in)["':\s]*(\d+(?:\.\d+)?)s/i);
  if (retryMatch?.[1]) {
    return Math.ceil(Number(retryMatch[1]) * 1000);
  }
  if (message.includes("[429 Too Many Requests]") || message.includes("Too Many Requests")) {
    return 60_000;
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GeminiClient implements JsonAiClient {
  private readonly client: GoogleGenerativeAI;

  constructor() {
    this.client = new GoogleGenerativeAI(requireGeminiApiKey());
  }

  async generateJson<T>(
    prompt: string,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    attempts = 3
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const model = this.client.getGenerativeModel({
          model: config.geminiModel,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.35
          }
        });
        const result = await model.generateContent(prompt);
        return parseAiJson(result.response.text(), schema);
      } catch (error) {
        lastError = error;
        const quotaDelay = retryDelayMs(error);
        logger.warn(
          {
            attempt,
            retryDelayMs: quotaDelay,
            error: describeError(error)
          },
          "Gemini request failed; retrying"
        );
        if (attempt < attempts) {
          await sleep(quotaDelay ?? attempt * 1000);
        }
      }
    }
    throw lastError;
  }
}
