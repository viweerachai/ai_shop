import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-3.1-flash-lite"),
  GEMINI_IMAGE_MODEL: z.string().default("gemini-2.5-flash-image"),
  IMAGE_AI_ASPECT_RATIO: z.string().default("1:1"),
  IMAGE_AI_OUTPUT_FORMAT: z.enum(["png", "jpeg", "webp"]).default("jpeg"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-6"),
  GOOGLE_CLIENT_EMAIL: z.string().optional(),
  GOOGLE_PRIVATE_KEY: z.string().optional(),
  GOOGLE_SHEET_ID: z.string().optional(),
  GOOGLE_DRIVE_FOLDER_ID: z.string().optional(),
  DEFAULT_TIMEZONE: z.string().default("Asia/Tokyo"),
  LOG_LEVEL: z.string().default("info"),
  DRY_RUN: z.enum(["true", "false"]).default("false"),
  PORT: z.coerce.number().int().positive().default(3100),
  AUTO_MODE: z.enum(["semi_auto", "trusted_auto", "full_auto"]).default("trusted_auto"),
  AUTO_PUBLISH: z.enum(["true", "false"]).default("false"),
  AUTO_APPROVE_MIN_SCORE: z.coerce.number().min(0).max(100).default(90),
  AUTO_APPROVE_MAX_RISK: z.enum(["low", "medium", "high"]).default("low"),
  DAILY_AUTO_RUN_TIME: z.string().regex(/^\d{2}:\d{2}$/).default("09:00"),
  API_ADMIN_TOKEN: z.string().optional()
});

const env = envSchema.parse(process.env);

function normalizeAnthropicModel(value: string): string {
  const deprecatedMap: Record<string, string> = {
    "claude-3-5-sonnet-latest": "claude-sonnet-4-6",
    "claude-3-5-sonnet-20241022": "claude-sonnet-4-6",
    "claude-3-5-sonnet-20240620": "claude-sonnet-4-6",
    "claude-3-sonnet-20240229": "claude-sonnet-4-6",
    "claude-sonnet-4-20250514": "claude-sonnet-4-6",
    "claude-opus-4-20250514": "claude-opus-4-8"
  };
  return deprecatedMap[value] ?? value;
}

export const config = {
  geminiApiKey: env.GEMINI_API_KEY,
  geminiModel: env.GEMINI_MODEL,
  geminiImageModel: env.GEMINI_IMAGE_MODEL,
  imageAiAspectRatio: env.IMAGE_AI_ASPECT_RATIO,
  imageAiOutputFormat: env.IMAGE_AI_OUTPUT_FORMAT,
  anthropicApiKey: env.ANTHROPIC_API_KEY,
  anthropicModel: normalizeAnthropicModel(env.ANTHROPIC_MODEL),
  googleClientEmail: env.GOOGLE_CLIENT_EMAIL,
  googlePrivateKey: env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  googleSheetId: env.GOOGLE_SHEET_ID,
  googleDriveFolderId: env.GOOGLE_DRIVE_FOLDER_ID,
  timezone: env.DEFAULT_TIMEZONE,
  logLevel: env.LOG_LEVEL,
  dryRun: env.DRY_RUN === "true",
  port: env.PORT,
  autoMode: env.AUTO_MODE,
  autoPublish: env.AUTO_PUBLISH === "true",
  autoApproveMinScore: env.AUTO_APPROVE_MIN_SCORE,
  autoApproveMaxRisk: env.AUTO_APPROVE_MAX_RISK,
  dailyAutoRunTime: env.DAILY_AUTO_RUN_TIME,
  apiAdminToken: env.API_ADMIN_TOKEN,
  hasGoogleCredentials: Boolean(
    env.GOOGLE_CLIENT_EMAIL && env.GOOGLE_PRIVATE_KEY && env.GOOGLE_SHEET_ID
  ),
  hasGeminiCredentials: Boolean(env.GEMINI_API_KEY),
  hasGeminiImageCredentials: Boolean(env.GEMINI_API_KEY),
  hasAnthropicCredentials: Boolean(env.ANTHROPIC_API_KEY),
  hasAdminToken: Boolean(env.API_ADMIN_TOKEN)
};

export function requireGoogleConfig(): {
  clientEmail: string;
  privateKey: string;
  sheetId: string;
} {
  if (!config.googleClientEmail || !config.googlePrivateKey || !config.googleSheetId) {
    throw new Error(
      "Google Sheets credentials are missing. Set GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SHEET_ID."
    );
  }
  return {
    clientEmail: config.googleClientEmail,
    privateKey: config.googlePrivateKey,
    sheetId: config.googleSheetId
  };
}

export function requireGeminiApiKey(): string {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }
  return config.geminiApiKey;
}

export function requireAnthropicApiKey(): string {
  if (!config.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is missing.");
  }
  return config.anthropicApiKey;
}
