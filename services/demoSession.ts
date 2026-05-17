import type { ActivityMode } from "../constants/config";
import {
  COACHING_CONFIG,
  DEMO_ROUTE_CONFIG,
  DEMO_USER_PROFILE,
  TRAINING_GOALS
} from "../constants/config";
import { getDistanceMeters } from "../utils/geo";
import { summarizeTelemetry } from "../utils/raceAnalytics";
import type { SaveSessionInput, SessionPoint } from "./sessions";

export function createDemoSessions(): SaveSessionInput[] {
  return [
    createDemoSession("run", "Personal Best Chase", 0),
    createDemoSession("ride", "Live Rival Simulation", 1)
  ];
}

export function createDemoSession(
  mode: ActivityMode,
  title: string,
  variant: number
): SaveSessionInput {
  const duration =
    mode === "ride" ? DEMO_ROUTE_CONFIG.rideDurationMs : DEMO_ROUTE_CONFIG.runDurationMs;
  const startedAt = Date.now() - (variant + 1) * 24 * 60 * 60 * 1000;
  const points = buildRoutePoints(mode, startedAt, duration, variant);
  const distance = getRouteDistance(points);
  const targetPace =
    mode === "ride"
      ? TRAINING_GOALS.rideTargetPaceMinPerKm
      : TRAINING_GOALS.runTargetPaceMinPerKm;

  return {
    distance,
    duration,
    goal: {
      targetDistanceMeters: Math.round(distance),
      targetPaceMinPerKm: targetPace,
      targetTimeMs: Math.round(targetPace * 60000 * (distance / 1000))
    },
    mode,
    points,
    source: "demo",
    startedAt,
    summary: summarizeTelemetry(points, distance, duration),
    title,
    weather: {
      condition: variant === 0 ? "Clear" : "Breezy",
      temperatureF: variant === 0 ? 64 : 68,
      windMph: COACHING_CONFIG.defaultWeatherWindMph + variant * 5
    }
  };
}

function buildRoutePoints(
  mode: ActivityMode,
  startedAt: number,
  duration: number,
  variant: number
): SessionPoint[] {
  const count = Math.floor(duration / DEMO_ROUTE_CONFIG.telemetryIntervalMs) + 1;
  const scale = mode === "ride" ? 2.2 : 1;
  const latBase = DEMO_ROUTE_CONFIG.baseLat + variant * 0.002;
  const lngBase = DEMO_ROUTE_CONFIG.baseLng - variant * 0.002;
  const points: SessionPoint[] = [];

  for (let index = 0; index < count; index += 1) {
    const progress = index / Math.max(count - 1, 1);
    const bend = Math.sin(progress * Math.PI * 2) * 0.0008 * scale;
    const hill = Math.sin(progress * Math.PI * 3 + variant * 0.8);
    const lat = latBase + progress * 0.014 * scale + bend;
    const lng = lngBase + Math.sin(progress * Math.PI) * 0.01 * scale;
    const elevation = 28 + hill * 16 + progress * 10;
    const heartRate =
      mode === "ride"
        ? 138 + Math.round(Math.sin(progress * Math.PI * 4) * 11 + progress * 18)
        : 148 + Math.round(Math.sin(progress * Math.PI * 4) * 13 + progress * 25);
    const previousPoint = points[index - 1];
    const timestamp = startedAt + index * DEMO_ROUTE_CONFIG.telemetryIntervalMs;
    const distanceDelta = previousPoint
      ? getDistanceMeters(previousPoint, { lat, lng })
      : 0;
    const pace =
      distanceDelta > 0
        ? DEMO_ROUTE_CONFIG.telemetryIntervalMs / 60000 / (distanceDelta / 1000)
        : null;
    const speed = distanceDelta / (DEMO_ROUTE_CONFIG.telemetryIntervalMs / 1000);

    points.push({
      accuracy: index % 61 === 0 ? 24 : 6,
      cadence: mode === "ride" ? 82 + Math.round(Math.sin(progress * 8) * 6) : null,
      elevation: Math.round(elevation),
      heartRate: Math.min(heartRate, DEMO_USER_PROFILE.estimatedMaxHeartRate - 5),
      lat,
      lng,
      pace,
      speed,
      timestamp
    });
  }

  return points;
}

function getRouteDistance(points: SessionPoint[]): number {
  let distance = 0;

  for (let index = 1; index < points.length; index += 1) {
    distance += getDistanceMeters(points[index - 1], points[index]);
  }

  return Math.round(distance);
}
