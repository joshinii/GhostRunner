import { ghostPosition, GhostPoint } from "./ghostEngine";
import { summarizeTelemetry } from "./raceAnalytics";
import type { SessionPoint } from "../services/sessions";

export function benchmarkGhostInterpolation(pointCount: number): { avgMs: number; ops: number } {
  const points: GhostPoint[] = Array.from({ length: pointCount }, (_, i) => ({
    lat: 37.33 + i * 0.0001,
    lng: -121.88 + i * 0.0001,
    timestamp: i * 1000
  }));

  const maxElapsed = (pointCount - 1) * 1000;
  const iterations = 1000;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    ghostPosition(points, Math.random() * maxElapsed);
  }

  const elapsed = performance.now() - start;
  const avgMs = elapsed / iterations;

  return { avgMs, ops: Math.round(1000 / avgMs) };
}

export function benchmarkTelemetrySummary(pointCount: number): { avgMs: number } {
  const points: SessionPoint[] = Array.from({ length: pointCount }, (_, i) => ({
    lat: 37.33 + i * 0.0001,
    lng: -121.88 + i * 0.0001,
    timestamp: 1000 + i * 1000,
    pace: 5.0 + Math.random(),
    heartRate: 140 + Math.floor(Math.random() * 40),
    elevation: 10 + i * 0.1,
    accuracy: 5,
    speed: 3.2
  }));

  const iterations = 100;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    summarizeTelemetry(points, pointCount * 3, pointCount * 1000);
  }

  const elapsed = performance.now() - start;

  return { avgMs: elapsed / iterations };
}
