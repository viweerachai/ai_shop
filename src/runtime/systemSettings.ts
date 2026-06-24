import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";

export interface SystemSettings {
  autoMode: "semi_auto" | "trusted_auto" | "full_auto";
  autoPublish: boolean;
  minScore: number;
  maxRisk: "low" | "medium" | "high";
}

const defaultSettings: SystemSettings = {
  autoMode: config.autoMode,
  autoPublish: config.autoPublish,
  minScore: config.autoApproveMinScore,
  maxRisk: config.autoApproveMaxRisk
};

const settingsPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../.runtime/system-settings.json"
);

function readSettings(): SystemSettings {
  if (!existsSync(settingsPath)) {
    return { ...defaultSettings };
  }

  try {
    const raw = JSON.parse(readFileSync(settingsPath, "utf8")) as Partial<SystemSettings>;
    return {
      autoMode: raw.autoMode ?? defaultSettings.autoMode,
      autoPublish: raw.autoPublish ?? defaultSettings.autoPublish,
      minScore: raw.minScore ?? defaultSettings.minScore,
      maxRisk: raw.maxRisk ?? defaultSettings.maxRisk
    };
  } catch {
    return { ...defaultSettings };
  }
}

function writeSettings(settings: SystemSettings): void {
  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

let settings = readSettings();

export function getSystemSettings(): SystemSettings {
  return { ...settings };
}

export function updateSystemSettings(update: Partial<SystemSettings>): SystemSettings {
  settings = { ...settings, ...update };
  writeSettings(settings);
  return getSystemSettings();
}
