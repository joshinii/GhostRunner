import {
  DEMO_USER_PROFILE,
  HEART_RATE_ZONES,
  TRAINING_GOALS
} from "../constants/config";
import type { ActivityMode } from "../constants/config";

export type HeartRateZone = "easy" | "tempo" | "threshold" | "danger";

export type AgentSnapshot = {
  distanceRemaining: number;
  elapsedMs: number;
  elevationAhead: number;
  gapMeters: number;
  heartRate: number;
  maxHeartRate: number;
  mode: ActivityMode;
  pace: number;
  projectedFinishMs: number;
  speed: number;
  targetPace: number;
  timeGapSeconds: number;
  weatherWindMph: number;
};

export type LocalCoachingInstruction = {
  instruction: string;
  reason: string;
  safetyOverride: boolean;
  severity: "info" | "push" | "hold" | "recover" | "danger";
  toolUsed: string;
};

export function getHeartRateZone(
  heartRate: number,
  maxHeartRate: number = DEMO_USER_PROFILE.estimatedMaxHeartRate
): HeartRateZone {
  const percentage = heartRate / maxHeartRate;

  if (percentage >= HEART_RATE_ZONES.dangerMinPct) {
    return "danger";
  }

  if (percentage >= HEART_RATE_ZONES.thresholdMaxPct) {
    return "threshold";
  }

  if (percentage >= HEART_RATE_ZONES.tempoMaxPct) {
    return "tempo";
  }

  return "easy";
}

export function predictFinishTimeMs(
  elapsedMs: number,
  distanceRemaining: number,
  paceMinPerKm: number,
  elevationAhead: number,
  weatherWindMph: number
): number {
  const safePace = paceMinPerKm > 0 ? paceMinPerKm : TRAINING_GOALS.runTargetPaceMinPerKm;
  const terrainPenaltyMs = Math.max(elevationAhead, 0) * 380;
  const windPenaltyMs = Math.max(weatherWindMph - 10, 0) * 900;
  const remainingMs = safePace * 60000 * (distanceRemaining / 1000);

  return Math.round(elapsedMs + remainingMs + terrainPenaltyMs + windPenaltyMs);
}

export function estimateTimeGapSeconds(gapMeters: number, paceMinPerKm: number): number {
  if (paceMinPerKm <= 0) {
    return 0;
  }

  return Math.round((gapMeters / 1000) * paceMinPerKm * 60);
}

export function makeLocalCoachingInstruction(
  snapshot: AgentSnapshot
): LocalCoachingInstruction {
  const zone = getHeartRateZone(snapshot.heartRate, snapshot.maxHeartRate);

  if (zone === "danger" || snapshot.heartRate >= TRAINING_GOALS.safetyHeartRateCeiling) {
    return {
      instruction: "Heart rate is too high. Ease off now and recover.",
      reason: "Bio-Guard safety threshold exceeded.",
      safetyOverride: true,
      severity: "danger",
      toolUsed: "Bio-Guard Tool"
    };
  }

  if (zone === "threshold" && snapshot.elevationAhead > 4) {
    return {
      instruction: "Hold effort before the climb. Do not chase yet.",
      reason: "Heart rate is near threshold with uphill terrain ahead.",
      safetyOverride: false,
      severity: "recover",
      toolUsed: "Heart Rate Analysis Tool"
    };
  }

  if (snapshot.gapMeters < -18 && zone !== "threshold") {
    return {
      instruction: "Close the gap gradually. Add cadence for thirty seconds.",
      reason: "You are behind but biometric load is still controlled.",
      safetyOverride: false,
      severity: "push",
      toolUsed: "Dynamic Pacer Tool"
    };
  }

  if (snapshot.elevationAhead > 6) {
    return {
      instruction: "Settle your breathing now. Shorten stride for the hill.",
      reason: "Elevation scan shows a near-term climb.",
      safetyOverride: false,
      severity: "hold",
      toolUsed: "Upcoming Elevation Scan Tool"
    };
  }

  if (snapshot.weatherWindMph >= 14) {
    return {
      instruction: "Stay smooth into the wind. Keep effort steady.",
      reason: "Weather tool detected effort-costing wind.",
      safetyOverride: false,
      severity: "hold",
      toolUsed: "Terrain and Weather Analyst Tool"
    };
  }

  if (snapshot.gapMeters > 20 && zone === "easy") {
    return {
      instruction: "You are ahead. Bank energy and keep rhythm.",
      reason: "Gap is positive and heart rate remains sustainable.",
      safetyOverride: false,
      severity: "info",
      toolUsed: "Predict Finish Time Tool"
    };
  }

  return {
    instruction: "Hold this pace. Check form and keep the ghost in sight.",
    reason: "Current pace, gap, and heart-rate zone are balanced.",
    safetyOverride: false,
    severity: "hold",
    toolUsed: "Observe-Reason-Act Loop"
  };
}
