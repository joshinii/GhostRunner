import type { CoachingEvent, SessionPoint } from "./sessions";

export type CoachingEffectiveness = {
  adviceFollowed: boolean;
  eventId: string;
  hrChangeAfter: number | null;
  paceChangeAfter: number | null;
  sessionId: string;
  severity: string;
};

export function analyzeCoachingEffectiveness(
  events: CoachingEvent[],
  points: SessionPoint[]
): CoachingEffectiveness[] {
  if (points.length === 0) {
    return [];
  }

  const startTimestamp = points[0].timestamp;

  return events.map((event) => {
    const eventTimestamp = startTimestamp + event.elapsedMs;
    const windowMs = 30000;

    const before = findNearestPoint(points, eventTimestamp - 5000);
    const after = findNearestPoint(points, eventTimestamp + windowMs);

    const hrBefore = before?.heartRate ?? null;
    const hrAfter = after?.heartRate ?? null;
    const paceBefore = before?.pace ?? null;
    const paceAfter = after?.pace ?? null;

    const hrChange =
      typeof hrBefore === "number" && typeof hrAfter === "number"
        ? hrAfter - hrBefore
        : null;
    const paceChange =
      typeof paceBefore === "number" && typeof paceAfter === "number"
        ? paceAfter - paceBefore
        : null;

    const adviceFollowed = didFollowAdvice(event.severity, hrChange, paceChange);

    return {
      adviceFollowed,
      eventId: event.id,
      hrChangeAfter: hrChange,
      paceChangeAfter: paceChange,
      sessionId: "",
      severity: event.severity
    };
  });
}

export function getCoachingPersonalization(
  pastEffectiveness: CoachingEffectiveness[]
): { pushFrequency: number; severityBias: number } {
  if (pastEffectiveness.length === 0) {
    return { pushFrequency: 1.0, severityBias: 0 };
  }

  const pushEvents = pastEffectiveness.filter((e) => e.severity === "push");
  const pushFollowed = pushEvents.filter((e) => e.adviceFollowed).length;
  const pushFollowRate = pushEvents.length > 0 ? pushFollowed / pushEvents.length : 1.0;

  const holdEvents = pastEffectiveness.filter((e) => e.severity === "hold");
  const holdFollowed = holdEvents.filter((e) => e.adviceFollowed).length;
  const holdFollowRate = holdEvents.length > 0 ? holdFollowed / holdEvents.length : 1.0;

  // Reduce push frequency if user typically ignores push advice
  const pushFrequency = 0.5 + pushFollowRate * 0.5;
  // Positive bias when user responds well to hold advice
  const severityBias = holdFollowRate > 0.7 ? 1 : 0;

  return { pushFrequency, severityBias };
}

function findNearestPoint(points: SessionPoint[], targetTimestamp: number): SessionPoint | null {
  if (points.length === 0) return null;

  let closest = points[0];
  let minDiff = Math.abs(points[0].timestamp - targetTimestamp);

  for (const point of points) {
    const diff = Math.abs(point.timestamp - targetTimestamp);
    if (diff < minDiff) {
      minDiff = diff;
      closest = point;
    }
  }

  return closest;
}

function didFollowAdvice(
  severity: string,
  hrChange: number | null,
  paceChange: number | null
): boolean {
  if (severity === "push") {
    // Following push = pace improved (lower min/km) or HR increased indicating effort
    return (typeof paceChange === "number" && paceChange < -0.1) ||
      (typeof hrChange === "number" && hrChange > 3);
  }

  if (severity === "hold" || severity === "recover") {
    // Following hold/recover = HR decreased or pace slowed
    return (typeof hrChange === "number" && hrChange < -2) ||
      (typeof paceChange === "number" && paceChange > 0.1);
  }

  if (severity === "danger") {
    // Following danger = HR decreased
    return typeof hrChange === "number" && hrChange < -5;
  }

  return true;
}
