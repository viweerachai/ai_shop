import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createId } from "../utils/ids.js";
import { nowIso } from "../utils/date.js";
import {
  StrategyAction,
  StrategyActionArtifact,
  StrategyActionHistoryEntry,
  StrategyActionTask
} from "../types/strategyAction.js";

type MutableActionStatus = StrategyAction["status"];

type StrategyActionStoreState = {
  statuses: Record<string, MutableActionStatus>;
  customActions: StrategyAction[];
  tasks: StrategyActionTask[];
  history: StrategyActionHistoryEntry[];
  artifacts: StrategyActionArtifact[];
};

const defaultPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../.runtime/strategy-actions.json"
);

class StrategyActionStore {
  constructor(private readonly filePath = defaultPath) {}

  private readState(): StrategyActionStoreState {
    if (!existsSync(this.filePath)) {
      return { statuses: {}, customActions: [], tasks: [], history: [], artifacts: [] };
    }

    try {
      const raw = JSON.parse(readFileSync(this.filePath, "utf8")) as Partial<StrategyActionStoreState>;
      return {
        statuses: raw.statuses ?? {},
        customActions: raw.customActions ?? [],
        tasks: raw.tasks ?? [],
        history: raw.history ?? [],
        artifacts: raw.artifacts ?? []
      };
    } catch {
      return { statuses: {}, customActions: [], tasks: [], history: [], artifacts: [] };
    }
  }

  private writeState(state: StrategyActionStoreState): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(state, null, 2));
  }

  apply(actions: StrategyAction[]): StrategyAction[] {
    const state = this.readState();
    return actions.map((action) => ({
      ...action,
      status: state.statuses[action.id] ?? action.status
    }));
  }

  customActions(): StrategyAction[] {
    return this.apply(this.readState().customActions);
  }

  addCustomAction(action: StrategyAction): StrategyAction {
    const state = this.readState();
    const existingIndex = state.customActions.findIndex((item) => item.id === action.id);
    const nextAction = {
      ...action,
      status: state.statuses[action.id] ?? action.status
    };
    if (existingIndex >= 0) {
      state.customActions[existingIndex] = nextAction;
    } else {
      state.customActions.unshift(nextAction);
    }
    state.customActions = state.customActions.slice(0, 50);
    state.history.unshift({
      historyId: createId("history"),
      actionId: nextAction.id,
      title: nextAction.title,
      transition: "status_changed",
      fromStatus: "none",
      toStatus: nextAction.status,
      createdAt: nowIso(),
      note: nextAction.reason
    });
    state.history = state.history.slice(0, 100);
    this.writeState(state);
    return nextAction;
  }

  private createArtifactForAction(action: StrategyAction): StrategyActionArtifact | null {
    if (action.id === "hero-sonny") {
      return {
        artifactId: createId("artifact"),
        actionId: action.id,
        kind: "content_plan",
        status: "open",
        title: "Content Brief: Sonny Hero Launch",
        summary: action.reason,
        owner: action.owner,
        sku: action.sku,
        platform: "Facebook, Instagram",
        contentType: "new_arrival",
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
    }
    if (action.id === "review-chopper") {
      return {
        artifactId: createId("artifact"),
        actionId: action.id,
        kind: "content_plan",
        status: "open",
        title: "Content Brief: Chopper Review Push",
        summary: action.reason,
        owner: action.owner,
        sku: action.sku,
        platform: "Facebook, TikTok",
        contentType: "review",
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
    }
    if (action.id === "promo-gate-shared") {
      return {
        artifactId: createId("artifact"),
        actionId: action.id,
        kind: "promotion_plan",
        status: "open",
        title: "Promotion Review Queue",
        summary: action.reason,
        owner: action.owner,
        sku: action.sku,
        promotionType: "bundle",
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
    }
    if (action.id === "restock-totoro") {
      return {
        artifactId: createId("artifact"),
        actionId: action.id,
        kind: "stock_followup",
        status: "open",
        title: "Stock Follow-up: Totoro",
        summary: action.reason,
        owner: action.owner,
        sku: action.sku,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
    }
    if (action.id.startsWith("ceo-chat-")) {
      const kind: StrategyActionArtifact["kind"] = action.source === "promotion"
        ? "promotion_plan"
        : action.source === "operations"
        ? "stock_followup"
        : "content_plan";
      return {
        artifactId: createId("artifact"),
        actionId: action.id,
        kind,
        status: "open",
        title: action.title,
        summary: action.reason,
        owner: action.owner,
        sku: action.sku,
        platform: kind === "content_plan" ? "Facebook, Instagram, TikTok" : undefined,
        contentType: kind === "content_plan" ? "ceo_directive" : undefined,
        promotionType: kind === "promotion_plan" ? "owner_review_required" : undefined,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
    }
    return null;
  }

  snapshot(): {
    activeTasks: StrategyActionTask[];
    recentHistory: StrategyActionHistoryEntry[];
    recentArtifacts: StrategyActionArtifact[];
  } {
    const state = this.readState();
    return {
      activeTasks: [...state.tasks]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 8),
      recentHistory: [...state.history]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 12),
      recentArtifacts: [...state.artifacts]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 12)
    };
  }

  update(action: StrategyAction, status: MutableActionStatus): { id: string; status: MutableActionStatus } {
    const state = this.readState();
    const previous = state.statuses[action.id] ?? action.status;
    state.statuses[action.id] = status;

    if (status === "in_progress") {
      const existingTask = state.tasks.find((task) => task.actionId === action.id && task.status === "open");
      if (!existingTask) {
        state.tasks.unshift({
          taskId: createId("task"),
          actionId: action.id,
          title: action.title,
          owner: action.owner,
          status: "open",
          source: action.source,
          detail: action.reason,
          sku: action.sku,
          createdAt: nowIso(),
          updatedAt: nowIso()
        });
      } else {
        existingTask.updatedAt = nowIso();
      }

      const existingArtifact = state.artifacts.find((artifact) => artifact.actionId === action.id && artifact.status === "open");
      if (!existingArtifact) {
        const artifact = this.createArtifactForAction(action);
        if (artifact) state.artifacts.unshift(artifact);
      } else {
        existingArtifact.updatedAt = nowIso();
      }
    }

    if (status === "completed") {
      const existingTask = state.tasks.find((task) => task.actionId === action.id && task.status === "open");
      if (existingTask) {
        existingTask.status = "done";
        existingTask.updatedAt = nowIso();
      }
      const existingArtifact = state.artifacts.find((artifact) => artifact.actionId === action.id);
      if (!existingArtifact) {
        const artifact = this.createArtifactForAction(action);
        if (artifact) state.artifacts.unshift({ ...artifact, status: "done", updatedAt: nowIso() });
      }
      state.artifacts = state.artifacts.map((artifact) =>
        artifact.actionId === action.id && artifact.status === "open"
          ? { ...artifact, status: "done", updatedAt: nowIso() }
          : artifact
      );
    }

    state.history.unshift({
      historyId: createId("history"),
      actionId: action.id,
      title: action.title,
      transition: status === "in_progress"
        ? "started"
        : status === "completed"
        ? "completed"
        : "status_changed",
      fromStatus: previous,
      toStatus: status,
      createdAt: nowIso(),
      note: action.reason
    });
    state.history = state.history.slice(0, 100);
    state.tasks = state.tasks.slice(0, 50);
    state.artifacts = state.artifacts.slice(0, 50);
    this.writeState(state);
    return { id: action.id, status };
  }

  reset(action: StrategyAction): { id: string } {
    const state = this.readState();
    const previous = state.statuses[action.id] ?? action.status;
    delete state.statuses[action.id];
    state.tasks = state.tasks.map((task) =>
      task.actionId === action.id && task.status === "open"
        ? { ...task, status: "canceled", updatedAt: nowIso() }
        : task
    );
    state.artifacts = state.artifacts.map((artifact) =>
      artifact.actionId === action.id && artifact.status === "open"
        ? { ...artifact, status: "canceled", updatedAt: nowIso() }
        : artifact
    );
    state.history.unshift({
      historyId: createId("history"),
      actionId: action.id,
      title: action.title,
      transition: "reset",
      fromStatus: previous,
      toStatus: "none",
      createdAt: nowIso(),
      note: action.reason
    });
    state.history = state.history.slice(0, 100);
    this.writeState(state);
    return { id: action.id };
  }
}

export const strategyActionStore = new StrategyActionStore();
