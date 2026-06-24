import { ClaudeClient } from "../ai/claudeClient.js";
import { GeminiClient } from "../ai/geminiClient.js";
import { config } from "../config.js";
import { createRepos, Repos } from "../sheets/repos.js";

export interface WorkflowContext {
  repos: Repos;
  gemini: GeminiClient;
  claude: ClaudeClient | null;
}

export function createWorkflowContext(): WorkflowContext {
  return {
    repos: createRepos(),
    gemini: new GeminiClient(),
    claude: config.hasAnthropicCredentials ? new ClaudeClient() : null
  };
}
