import type { AiPlan } from "../ai/types.js";

export function requiresApproval(plan: AiPlan) {
  return plan.needsApproval || plan.riskLevel === "HIGH" || plan.riskLevel === "CRITICAL";
}
