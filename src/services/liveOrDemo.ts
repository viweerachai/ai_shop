import { config } from "../config.js";

let warned = false;

export async function liveOrDemo<T>(
  liveFn: () => Promise<T>,
  demoFn: () => T | Promise<T>,
  label: string
): Promise<T> {
  if (!config.hasGoogleCredentials) return demoFn();
  try {
    return await liveFn();
  } catch (error) {
    if (!warned) {
      warned = true;
      console.warn(
        `[liveOrDemo] ${label} live data failed, falling back to demo. Reason: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
    return demoFn();
  }
}
