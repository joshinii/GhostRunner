import { httpsCallable } from "firebase/functions";

import { functions } from "./firebase";

export type CoachingSnapshot = {
  pace: number;
  gapMeters: number;
  simulatedHR: number;
  upcomingElevationDelta: number;
  distanceRemaining: number;
};

export type CoachingInstruction = {
  instruction: string;
  severity: "info" | "caution" | "warning";
};

const getCoachingInstructionCallable = httpsCallable<
  CoachingSnapshot,
  CoachingInstruction
>(functions, "getCoachingInstruction");

export async function getCoachingInstruction(
  snapshot: CoachingSnapshot
): Promise<CoachingInstruction> {
  console.log("[GhostStrategist] coaching callable started", snapshot);

  const result = await getCoachingInstructionCallable(snapshot);

  console.log("[GhostStrategist] coaching callable finished", result.data);

  return result.data;
}
