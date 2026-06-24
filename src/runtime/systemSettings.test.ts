import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getSystemSettings, updateSystemSettings } from "./systemSettings.js";

const settingsPath = resolve(process.cwd(), ".runtime/system-settings.json");
const originalSettings = getSystemSettings();
const originalFile = existsSync(settingsPath) ? readFileSync(settingsPath, "utf8") : null;

afterEach(() => {
  updateSystemSettings(originalSettings);
  if (originalFile === null) {
    rmSync(settingsPath, { force: true });
  } else {
    writeFileSync(settingsPath, originalFile);
  }
});

describe("system settings", () => {
  it("persists updates to the runtime settings file", () => {
    const updated = updateSystemSettings({ autoMode: "full_auto", minScore: 95 });
    expect(updated.autoMode).toBe("full_auto");
    expect(updated.minScore).toBe(95);

    const file = JSON.parse(readFileSync(settingsPath, "utf8")) as { autoMode: string; minScore: number };
    expect(file.autoMode).toBe("full_auto");
    expect(file.minScore).toBe(95);
  });
});
