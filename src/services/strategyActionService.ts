import { StrategyAction } from "../types/strategyAction.js";
import { strategyActionStore } from "../runtime/strategyActionStore.js";
import { getDashboardData } from "./dashboardService.js";
import { getMarketingView } from "./marketingService.js";

export async function getCurrentStrategyActions(): Promise<StrategyAction[]> {
  const [dashboard, marketing] = await Promise.all([
    getDashboardData(),
    getMarketingView()
  ]);
  const merged = new Map<string, StrategyAction>();
  for (const action of [...strategyActionStore.customActions(), ...dashboard.ceo.actions, ...marketing.strategy.actions]) {
    if (!merged.has(action.id)) merged.set(action.id, action);
  }
  return [...merged.values()];
}

export async function findStrategyActionById(id: string): Promise<StrategyAction | undefined> {
  return (await getCurrentStrategyActions()).find((action) => action.id === id);
}
