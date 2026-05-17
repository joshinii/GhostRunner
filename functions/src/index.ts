import * as functions from "firebase-functions";

import { COACHING_CONFIG } from "./config";

type ActivityMode = "run" | "ride";
type CoachingSeverity = "info" | "push" | "hold" | "recover" | "danger";

type CoachingSnapshot = {
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

type CoachingInstruction = {
  instruction: string;
  projectedFinishMs?: number;
  reason: string;
  safetyOverride: boolean;
  severity: CoachingSeverity;
  toolUsed: string;
};

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseSnapshot(data: unknown): CoachingSnapshot {
  const snapshot = data as Partial<CoachingSnapshot>;

  if (
    !isNumber(snapshot.distanceRemaining) ||
    !isNumber(snapshot.elapsedMs) ||
    !isNumber(snapshot.elevationAhead) ||
    !isNumber(snapshot.gapMeters) ||
    !isNumber(snapshot.heartRate) ||
    !isNumber(snapshot.maxHeartRate) ||
    !isNumber(snapshot.pace) ||
    !isNumber(snapshot.projectedFinishMs) ||
    !isNumber(snapshot.speed) ||
    !isNumber(snapshot.targetPace) ||
    !isNumber(snapshot.timeGapSeconds) ||
    !isNumber(snapshot.weatherWindMph) ||
    (snapshot.mode !== "run" && snapshot.mode !== "ride")
  ) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "A complete Ghost Strategist snapshot is required."
    );
  }

  return {
    distanceRemaining: snapshot.distanceRemaining,
    elapsedMs: snapshot.elapsedMs,
    elevationAhead: snapshot.elevationAhead,
    gapMeters: snapshot.gapMeters,
    heartRate: snapshot.heartRate,
    maxHeartRate: snapshot.maxHeartRate,
    mode: snapshot.mode,
    pace: snapshot.pace,
    projectedFinishMs: snapshot.projectedFinishMs,
    speed: snapshot.speed,
    targetPace: snapshot.targetPace,
    timeGapSeconds: snapshot.timeGapSeconds,
    weatherWindMph: snapshot.weatherWindMph
  };
}

function heuristicInstruction(snapshot: CoachingSnapshot): CoachingInstruction {
  const heartRatePct = snapshot.heartRate / snapshot.maxHeartRate;

  if (
    snapshot.heartRate >= COACHING_CONFIG.heartRateWarningThreshold ||
    heartRatePct >= 0.96
  ) {
    return {
      instruction: "Heart rate is too high. Ease off now and recover.",
      projectedFinishMs: snapshot.projectedFinishMs,
      reason: "Bio-Guard detected unsafe exertion.",
      safetyOverride: true,
      severity: "danger",
      toolUsed: "Bio-Guard Tool"
    };
  }

  if (heartRatePct >= 0.92 && snapshot.elevationAhead > 4) {
    return {
      instruction: "Hold effort before the climb. Do not chase yet.",
      projectedFinishMs: snapshot.projectedFinishMs,
      reason: "Threshold heart rate plus upcoming elevation raises fatigue risk.",
      safetyOverride: false,
      severity: "recover",
      toolUsed: "Heart Rate Analysis Tool"
    };
  }

  if (snapshot.gapMeters < -18 && heartRatePct < 0.9) {
    return {
      instruction: "Close the gap gradually. Add cadence for thirty seconds.",
      projectedFinishMs: snapshot.projectedFinishMs,
      reason: "Gap is negative and heart rate remains controllable.",
      safetyOverride: false,
      severity: "push",
      toolUsed: "Dynamic Pacer Tool"
    };
  }

  if (snapshot.elevationAhead > 6) {
    return {
      instruction: "Shorten stride and settle breathing before the hill.",
      projectedFinishMs: snapshot.projectedFinishMs,
      reason: "Upcoming Elevation Scan found a near-term climb.",
      safetyOverride: false,
      severity: "hold",
      toolUsed: "Upcoming Elevation Scan Tool"
    };
  }

  if (snapshot.weatherWindMph >= 14) {
    return {
      instruction: "Stay smooth into the wind. Keep effort steady.",
      projectedFinishMs: snapshot.projectedFinishMs,
      reason: "Weather Analyst detected effort-costing wind.",
      safetyOverride: false,
      severity: "hold",
      toolUsed: "Terrain and Weather Analyst Tool"
    };
  }

  return {
    instruction: "Hold this pace. Keep the ghost in sight.",
    projectedFinishMs: snapshot.projectedFinishMs,
    reason: "Projected finish, gap, and heart rate are balanced.",
    safetyOverride: false,
    severity: "info",
    toolUsed: "Predict Finish Time Tool"
  };
}

function parseInstruction(content: string, snapshot: CoachingSnapshot): CoachingInstruction {
  let parsed: Partial<CoachingInstruction>;

  try {
    parsed = JSON.parse(content) as Partial<CoachingInstruction>;
  } catch (error) {
    console.log("[GhostStrategist] coaching JSON parse failed", {
      content,
      error
    });
    return heuristicInstruction(snapshot);
  }

  if (
    typeof parsed.instruction !== "string" ||
    typeof parsed.reason !== "string" ||
    typeof parsed.safetyOverride !== "boolean" ||
    typeof parsed.toolUsed !== "string" ||
    !["info", "push", "hold", "recover", "danger"].includes(parsed.severity ?? "")
  ) {
    console.log("[GhostStrategist] coaching JSON shape invalid", {
      parsed
    });
    return heuristicInstruction(snapshot);
  }

  return {
    instruction: parsed.instruction,
    projectedFinishMs: snapshot.projectedFinishMs,
    reason: parsed.reason,
    safetyOverride: parsed.safetyOverride,
    severity: parsed.severity as CoachingSeverity,
    toolUsed: parsed.toolUsed
  };
}

export const getCoachingInstruction = functions.https.onCall(
  async (data): Promise<CoachingInstruction> => {
    const snapshot = parseSnapshot(data);

    console.log("[GhostStrategist] coaching request received", snapshot);

    const safeInstruction = heuristicInstruction(snapshot);

    if (safeInstruction.safetyOverride) {
      console.log("[GhostStrategist] coaching skipped OpenAI for Bio-Guard", {
        heartRate: snapshot.heartRate
      });

      return safeInstruction;
    }

    const openAiKey = functions.config().openai?.key;

    if (typeof openAiKey !== "string" || openAiKey.length === 0) {
      console.log("[GhostStrategist] coaching using heuristic fallback; missing OpenAI key");
      return safeInstruction;
    }

    const response = await fetch(COACHING_CONFIG.openAiChatCompletionsUrl, {
      body: JSON.stringify({
        messages: [
          {
            content: COACHING_CONFIG.systemPrompt,
            role: "system"
          },
          {
            content: JSON.stringify({
              ...snapshot,
              heuristicBaseline: safeInstruction
            }),
            role: "user"
          }
        ],
        model: COACHING_CONFIG.model,
        response_format: {
          type: "json_object"
        }
      }),
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      const errorBody = await response.text();

      console.log("[GhostStrategist] coaching OpenAI request failed", {
        body: errorBody,
        status: response.status
      });

      return safeInstruction;
    }

    const responseJson = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };
    const content = responseJson.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      console.log("[GhostStrategist] coaching OpenAI response missing content", {
        responseJson
      });
      return safeInstruction;
    }

    const instruction = parseInstruction(content, snapshot);

    console.log("[GhostStrategist] coaching instruction generated", instruction);

    return instruction;
  }
);
