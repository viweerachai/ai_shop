import { config } from "../config.js";
import { createWorkflowContext } from "../workflows/context.js";
import { contentQaWorkflow } from "../workflows/contentQaWorkflow.js";
import { contentWriteWorkflow } from "../workflows/contentWriteWorkflow.js";
import { dailyCeoReviewWorkflow } from "../workflows/dailyCeoReviewWorkflow.js";
import { imageGenerateWorkflow } from "../workflows/imageGenerateWorkflow.js";
import { imagePlanWorkflow } from "../workflows/imagePlanWorkflow.js";
import { managerFinalCheckWorkflow } from "../workflows/managerFinalCheckWorkflow.js";
import { marketingCampaignWorkflow } from "../workflows/marketingCampaignWorkflow.js";
import { newArrivalWorkflow } from "../workflows/newArrivalWorkflow.js";
import { productIntakeWorkflow } from "../workflows/productIntakeWorkflow.js";
import { productQaWorkflow } from "../workflows/productQaWorkflow.js";
import { productWriteWorkflow } from "../workflows/productWriteWorkflow.js";
import { promotionSuggestionWorkflow } from "../workflows/promotionSuggestionWorkflow.js";
import { reportWorkflow } from "../workflows/reportWorkflow.js";
import { weeklyContentWorkflow } from "../workflows/weeklyContentWorkflow.js";
import { workflowRunStore } from "./workflowRunStore.js";

const AUTO_STEP_DELAY_MS = 5_000;

export const workflowNames = [
  "product:intake",
  "product:write",
  "product:qa",
  "ceo:daily",
  "marketing:campaign",
  "content:new-arrival",
  "content:plan",
  "content:write",
  "content:qa",
  "image:plan",
  "image:generate",
  "promo:suggest",
  "manager:final-check",
  "report:daily",
  "auto:once"
] as const;

export type WorkflowName = typeof workflowNames[number];

function needsGoogle(name: WorkflowName): boolean {
  return true;
}

function needsGemini(name: WorkflowName): boolean {
  return [
    "product:intake",
    "product:write",
    "product:qa",
    "marketing:campaign",
    "content:new-arrival",
    "content:plan",
    "content:write",
    "content:qa",
    "image:plan",
    "image:generate",
    "promo:suggest",
    "auto:once"
  ].includes(name);
}

function needsClaude(name: WorkflowName): boolean {
  return [
    "ceo:daily",
    "marketing:campaign",
    "content:new-arrival",
    "content:plan",
    "promo:suggest",
    "auto:once"
  ].includes(name);
}

export function assertWorkflowDependencies(name: WorkflowName): void {
  const missing: string[] = [];
  if (needsGoogle(name) && !config.hasGoogleCredentials) {
    missing.push("GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY / GOOGLE_SHEET_ID");
  }
  if (needsGemini(name) && !config.hasGeminiCredentials) {
    missing.push("GEMINI_API_KEY");
  }
  if (needsClaude(name) && !config.hasAnthropicCredentials) {
    missing.push("ANTHROPIC_API_KEY");
  }
  if (missing.length > 0) {
    throw new Error(`Missing workflow dependencies: ${missing.join(", ")}`);
  }
}

async function executeWorkflow(
  name: Exclude<WorkflowName, "auto:once">,
  context = createWorkflowContext()
): Promise<unknown> {
  switch (name) {
    case "product:intake": return productIntakeWorkflow(context);
    case "product:write": return productWriteWorkflow(context);
    case "product:qa": return productQaWorkflow(context);
    case "ceo:daily": return dailyCeoReviewWorkflow(context);
    case "marketing:campaign": return marketingCampaignWorkflow(context);
    case "content:new-arrival": return newArrivalWorkflow(context);
    case "content:plan": return weeklyContentWorkflow(context);
    case "content:write": return contentWriteWorkflow(context);
    case "content:qa": return contentQaWorkflow(context);
    case "image:plan": return imagePlanWorkflow(context);
    case "image:generate": return imageGenerateWorkflow(context);
    case "promo:suggest": return promotionSuggestionWorkflow(context);
    case "manager:final-check": return managerFinalCheckWorkflow(context);
    case "report:daily": return reportWorkflow(context);
  }
}

async function runWorkflowStep<T>(
  name: Exclude<WorkflowName, "auto:once">,
  work: () => Promise<T>
): Promise<T> {
  const run = workflowRunStore.start(name);
  try {
    const result = await work();
    workflowRunStore.finish(run.runId, result);
    return result;
  } catch (error) {
    workflowRunStore.fail(run.runId, error);
    throw error;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pauseAutoStep(): Promise<void> {
  await sleep(AUTO_STEP_DELAY_MS);
}

export async function runNamedWorkflow(name: WorkflowName): Promise<unknown> {
  assertWorkflowDependencies(name);
  const run = workflowRunStore.start(name);
  try {
    const result = name === "auto:once" ? await runAutoSequence() : await executeWorkflow(name);
    workflowRunStore.finish(run.runId, result);
    return { runId: run.runId, result };
  } catch (error) {
    workflowRunStore.fail(run.runId, error);
    throw error;
  }
}

export async function runAutoSequence(): Promise<Record<string, unknown>> {
  assertWorkflowDependencies("auto:once");
  const context = createWorkflowContext();
  const results: Record<string, unknown> = {};
  results.productIntake = await runWorkflowStep("product:intake", () => productIntakeWorkflow(context));
  await pauseAutoStep();
  results.productWrite = await runWorkflowStep("product:write", () => productWriteWorkflow(context));
  await pauseAutoStep();
  results.productQa = await runWorkflowStep("product:qa", () => productQaWorkflow(context));
  await pauseAutoStep();
  const ceoStrategy = await runWorkflowStep("ceo:daily", () => dailyCeoReviewWorkflow(context));
  results.ceo = ceoStrategy;
  await pauseAutoStep();
  const marketingCampaign = await runWorkflowStep("marketing:campaign", () => marketingCampaignWorkflow(context, ceoStrategy));
  results.marketing = marketingCampaign;
  await pauseAutoStep();
  results.newArrival = await runWorkflowStep("content:new-arrival", () => newArrivalWorkflow(context));
  await pauseAutoStep();
  results.contentPlan = await runWorkflowStep("content:plan", () => weeklyContentWorkflow(context, 7, ceoStrategy, marketingCampaign));
  await pauseAutoStep();
  results.contentWrite = await runWorkflowStep("content:write", () => contentWriteWorkflow(context));
  await pauseAutoStep();
  results.contentQa = await runWorkflowStep("content:qa", () => contentQaWorkflow(context));
  await pauseAutoStep();
  results.imagePlan = await runWorkflowStep("image:plan", () => imagePlanWorkflow(context));
  await pauseAutoStep();
  results.managerFinalCheck = await runWorkflowStep("manager:final-check", () => managerFinalCheckWorkflow(context));
  await pauseAutoStep();
  results.promotion = await runWorkflowStep("promo:suggest", () => promotionSuggestionWorkflow(context, ceoStrategy, marketingCampaign));
  await pauseAutoStep();
  results.report = await runWorkflowStep("report:daily", () => reportWorkflow(context));
  return results;
}
