import { createId } from "../utils/ids.js";
import { nowIso } from "../utils/date.js";

export type RunStatus = "running" | "completed" | "failed";

export interface WorkflowRun {
  runId: string;
  workflowName: string;
  status: RunStatus;
  startedAt: string;
  finishedAt: string;
  result?: unknown;
  error?: string;
}

class WorkflowRunStore {
  private readonly runs: WorkflowRun[] = [];

  start(workflowName: string): WorkflowRun {
    const run = {
      runId: createId("run"),
      workflowName,
      status: "running" as const,
      startedAt: nowIso(),
      finishedAt: ""
    };
    this.runs.unshift(run);
    this.runs.splice(50);
    return run;
  }

  finish(runId: string, result: unknown): void {
    const run = this.runs.find((item) => item.runId === runId);
    if (!run) return;
    run.status = "completed";
    run.result = result;
    run.finishedAt = nowIso();
  }

  fail(runId: string, error: unknown): void {
    const run = this.runs.find((item) => item.runId === runId);
    if (!run) return;
    run.status = "failed";
    run.error = error instanceof Error ? error.message : String(error);
    run.finishedAt = nowIso();
  }

  list(): WorkflowRun[] {
    return [...this.runs];
  }

  hasRunning(workflowName?: string): boolean {
    return this.runs.some((run) =>
      run.status === "running" && (!workflowName || run.workflowName === workflowName)
    );
  }
}

export const workflowRunStore = new WorkflowRunStore();
