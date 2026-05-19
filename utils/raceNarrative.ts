import type { CoachingEvent, RaceResultSummary } from "../services/sessions";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function generateRaceNarrative(
  events: CoachingEvent[],
  result: RaceResultSummary,
  sessionDuration: number
): string[] {
  const lines: string[] = [];

  const dangerEvents = events.filter((e) => e.severity === "danger");
  const pushEvents = events.filter((e) => e.severity === "push");
  const holdEvents = events.filter((e) => e.severity === "hold");
  const recoverEvents = events.filter((e) => e.severity === "recover");

  for (const event of dangerEvents) {
    const snap = event.snapshotAtEvent;
    if (snap) {
      lines.push(
        `At ${formatElapsed(event.elapsedMs)}, Bio-Guard activated because heart rate reached ${Math.round(snap.heartRate)} bpm. The ghost was paused to protect your safety.`
      );
    } else {
      lines.push(
        `At ${formatElapsed(event.elapsedMs)}, Bio-Guard activated. Heart rate hit ${Math.round(event.heartRate)} bpm — the ghost was paused.`
      );
    }
  }

  if (pushEvents.length > 0) {
    const first = pushEvents[0];
    const last = pushEvents[pushEvents.length - 1];
    const snap = first.snapshotAtEvent;
    if (snap && pushEvents.length > 1) {
      lines.push(
        `Between ${formatElapsed(first.elapsedMs)}–${formatElapsed(last.elapsedMs)}, the agent issued ${pushEvents.length} Push advisories to close a ${Math.abs(Math.round(snap.gapMeters))} m gap.`
      );
    } else {
      lines.push(
        `At ${formatElapsed(first.elapsedMs)}, the agent issued a Push advisory: "${first.instruction}"`
      );
    }
  }

  for (const event of recoverEvents) {
    const snap = event.snapshotAtEvent;
    if (snap) {
      lines.push(
        `At ${formatElapsed(event.elapsedMs)}, the agent switched to Recovery mode — heart rate was ${Math.round(snap.heartRate)} bpm with a ${Math.round(snap.elevationAhead)} m climb ahead.`
      );
    } else {
      lines.push(
        `At ${formatElapsed(event.elapsedMs)}, the agent issued a Recovery advisory: "${event.instruction}"`
      );
    }
  }

  for (const event of holdEvents) {
    const snap = event.snapshotAtEvent;
    const elevNote =
      snap && snap.elevationAhead > 0
        ? ` with a ${Math.round(snap.elevationAhead)} m climb ahead`
        : "";
    lines.push(
      `At ${formatElapsed(event.elapsedMs)}, the agent said Hold${elevNote}: "${event.instruction}"`
    );
  }

  const durationMinutes = Math.round(sessionDuration / 60000);
  const finalGap = result.finalGapMeters;
  const gapNote =
    finalGap !== null
      ? finalGap > 0
        ? `${Math.round(finalGap)} m ahead of the ghost`
        : `${Math.round(Math.abs(finalGap))} m behind the ghost`
      : "at the same position as the ghost";

  lines.push(
    `Final result: finished ${gapNote} in ${durationMinutes} min with ${result.coachingEventCount} coaching intervention${result.coachingEventCount !== 1 ? "s" : ""}.`
  );

  return lines;
}
