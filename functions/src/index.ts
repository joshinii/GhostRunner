import * as functions from "firebase-functions";

import { COACHING_CONFIG } from "./config";

type CoachingSeverity = "info" | "caution" | "warning";

type CoachingSnapshot = {
  pace: number;
  gapMeters: number;
  simulatedHR: number;
  upcomingElevationDelta: number;
  distanceRemaining: number;
};

type CoachingInstruction = {
  instruction: string;
  severity: CoachingSeverity;
};

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseSnapshot(data: unknown): CoachingSnapshot {
  const snapshot = data as Partial<CoachingSnapshot>;

  if (
    !isNumber(snapshot.pace) ||
    !isNumber(snapshot.gapMeters) ||
    !isNumber(snapshot.simulatedHR) ||
    !isNumber(snapshot.upcomingElevationDelta) ||
    !isNumber(snapshot.distanceRemaining)
  ) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "pace, gapMeters, simulatedHR, upcomingElevationDelta, and distanceRemaining are required numbers."
    );
  }

  return {
    distanceRemaining: snapshot.distanceRemaining,
    gapMeters: snapshot.gapMeters,
    pace: snapshot.pace,
    simulatedHR: snapshot.simulatedHR,
    upcomingElevationDelta: snapshot.upcomingElevationDelta
  };
}

function parseInstruction(content: string): CoachingInstruction {
  let parsed: Partial<CoachingInstruction>;

  try {
    parsed = JSON.parse(content) as Partial<CoachingInstruction>;
  } catch (error) {
    console.log("[GhostStrategist] coaching JSON parse failed", {
      content,
      error
    });
    throw new functions.https.HttpsError(
      "internal",
      "OpenAI returned invalid JSON."
    );
  }

  if (
    typeof parsed.instruction !== "string" ||
    !["info", "caution", "warning"].includes(parsed.severity ?? "")
  ) {
    console.log("[GhostStrategist] coaching JSON shape invalid", {
      parsed
    });
    throw new functions.https.HttpsError(
      "internal",
      "OpenAI returned an invalid coaching instruction."
    );
  }

  return {
    instruction: parsed.instruction,
    severity: parsed.severity as CoachingSeverity
  };
}

export const getCoachingInstruction = functions.https.onCall(
  async (data): Promise<CoachingInstruction> => {
    const snapshot = parseSnapshot(data);

    console.log("[GhostStrategist] coaching request received", snapshot);

    if (snapshot.simulatedHR >= COACHING_CONFIG.heartRateWarningThreshold) {
      console.log("[GhostStrategist] coaching skipped OpenAI for high HR", {
        simulatedHR: snapshot.simulatedHR
      });

      return {
        instruction: "Heart rate too high — slow down and recover",
        severity: "warning"
      };
    }

    const openAiKey = functions.config().openai?.key;

    if (typeof openAiKey !== "string" || openAiKey.length === 0) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "OpenAI key is not configured."
      );
    }

    console.log("[GhostStrategist] coaching OpenAI request started", {
      model: COACHING_CONFIG.model
    });

    const response = await fetch(COACHING_CONFIG.openAiChatCompletionsUrl, {
      body: JSON.stringify({
        messages: [
          {
            content: COACHING_CONFIG.systemPrompt,
            role: "system"
          },
          {
            content: JSON.stringify(snapshot),
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

      throw new functions.https.HttpsError(
        "internal",
        "OpenAI coaching request failed."
      );
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
      throw new functions.https.HttpsError(
        "internal",
        "OpenAI response did not include content."
      );
    }

    const instruction = parseInstruction(content);

    console.log("[GhostStrategist] coaching instruction generated", instruction);

    return instruction;
  }
);
