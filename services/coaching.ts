import { httpsCallable } from "firebase/functions";

import type { AgentSnapshot, LocalCoachingInstruction } from "../utils/agentTools";
import { makeLocalCoachingInstruction } from "../utils/agentTools";
import { functions } from "./firebase";

export type CoachingSnapshot = AgentSnapshot;

export type CoachingInstruction = LocalCoachingInstruction & {
  projectedFinishMs?: number;
};

const getCoachingInstructionCallable = httpsCallable<
  CoachingSnapshot,
  CoachingInstruction
>(functions, "getCoachingInstruction");

export async function getCoachingInstruction(
  snapshot: CoachingSnapshot
): Promise<CoachingInstruction> {
  console.log("[GhostStrategist] coaching callable started", snapshot);

  try {
    const result = await getCoachingInstructionCallable(snapshot);

    console.log("[GhostStrategist] coaching callable finished", result.data);

    return result.data;
  } catch (error) {
    const fallback = makeLocalCoachingInstruction(snapshot);

    console.log("[GhostStrategist] coaching local fallback used", {
      error,
      fallback
    });

    return {
      ...fallback,
      projectedFinishMs: snapshot.projectedFinishMs
    };
  }
}
