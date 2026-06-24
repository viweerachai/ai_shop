import { AgentContext } from "../types/agent.js";
import { Repos } from "../sheets/repos.js";

export async function loadAgentContext(
  repos: Repos,
  ruleTypes: string[]
): Promise<AgentContext> {
  const [rules, errors, examples] = await Promise.all([
    repos.promptRules.activeFor([...ruleTypes, "style_rule", "output_format", "error_rule"]),
    repos.errorMemory.active(),
    repos.approvedExamples.active()
  ]);
  return {
    rules: rules.map((rule) => rule.content),
    errors: errors.map((error) => error.correction_rule),
    approvedExamples: examples.map((example) => example.content)
  };
}
