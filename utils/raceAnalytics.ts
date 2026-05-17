import type { SessionPoint } from "../services/sessions";

export type SessionSummary = {
  averageHeartRate: number | null;
  averagePace: number | null;
  averageSpeed: number | null;
  dataQualityScore: number;
  elevationGain: number;
  maxHeartRate: number | null;
  packetLossEvents: number;
  pointCount: number;
};

export function summarizeTelemetry(
  points: SessionPoint[],
  distanceMeters: number,
  durationMs: number
): SessionSummary {
  const heartRates = points
    .map((point) => point.heartRate)
    .filter((heartRate): heartRate is number => typeof heartRate === "number");
  const speeds = points
    .map((point) => point.speed)
    .filter((speed): speed is number => typeof speed === "number" && speed > 0);
  const packetLossEvents = countPacketLossEvents(points);

  return {
    averageHeartRate: average(heartRates),
    averagePace:
      distanceMeters > 0 ? durationMs / 60000 / (distanceMeters / 1000) : null,
    averageSpeed: average(speeds),
    dataQualityScore: getDataQualityScore(points, packetLossEvents),
    elevationGain: getElevationGain(points),
    maxHeartRate: heartRates.length > 0 ? Math.max(...heartRates) : null,
    packetLossEvents,
    pointCount: points.length
  };
}

export function getElevationGain(points: SessionPoint[]): number {
  let gain = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1].elevation;
    const current = points[index].elevation;

    if (typeof previous !== "number" || typeof current !== "number") {
      continue;
    }

    gain += Math.max(current - previous, 0);
  }

  return Math.round(gain);
}

export function countPacketLossEvents(points: SessionPoint[]): number {
  let count = 0;

  for (let index = 1; index < points.length; index += 1) {
    if (points[index].timestamp - points[index - 1].timestamp > 2600) {
      count += 1;
    }
  }

  return count;
}

export function getDataQualityScore(
  points: SessionPoint[],
  packetLossEvents = countPacketLossEvents(points)
): number {
  if (points.length < 2) {
    return 0;
  }

  const weakAccuracyCount = points.filter(
    (point) => typeof point.accuracy === "number" && point.accuracy > 20
  ).length;
  const packetPenalty = packetLossEvents * 8;
  const accuracyPenalty = (weakAccuracyCount / points.length) * 25;
  const densityBonus = Math.min(points.length / 120, 1) * 10;

  return Math.max(0, Math.min(100, Math.round(90 + densityBonus - packetPenalty - accuracyPenalty)));
}

export function getPointNearElapsed(
  points: SessionPoint[],
  elapsedMs: number
): SessionPoint | null {
  if (points.length === 0) {
    return null;
  }

  const targetTimestamp = points[0].timestamp + elapsedMs;
  let closest = points[0];

  for (const point of points) {
    if (
      Math.abs(point.timestamp - targetTimestamp) <
      Math.abs(closest.timestamp - targetTimestamp)
    ) {
      closest = point;
    }
  }

  return closest;
}

export function getUpcomingElevationDelta(
  points: SessionPoint[],
  elapsedMs: number,
  lookaheadMs: number
): number {
  const current = getPointNearElapsed(points, elapsedMs);
  const future = getPointNearElapsed(points, elapsedMs + lookaheadMs);

  if (
    current === null ||
    future === null ||
    typeof current.elevation !== "number" ||
    typeof future.elevation !== "number"
  ) {
    return 0;
  }

  return Math.round(future.elevation - current.elevation);
}

export function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
