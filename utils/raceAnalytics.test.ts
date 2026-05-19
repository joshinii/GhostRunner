import {
  summarizeTelemetry,
  getElevationGain,
  countPacketLossEvents,
  getDataQualityScore
} from "./raceAnalytics";
import type { SessionPoint } from "../services/sessions";

function makePoint(overrides: Partial<SessionPoint> = {}): SessionPoint {
  return {
    lat: 37.33,
    lng: -121.88,
    timestamp: 1000,
    pace: 5.0,
    heartRate: 150,
    elevation: 10,
    accuracy: 5,
    speed: 3.2,
    ...overrides
  };
}

describe("summarizeTelemetry", () => {
  it("returns summary for normal data", () => {
    const points: SessionPoint[] = [
      makePoint({ timestamp: 1000, heartRate: 140 }),
      makePoint({ timestamp: 2000, heartRate: 160 })
    ];
    const summary = summarizeTelemetry(points, 1000, 120000);
    expect(summary.pointCount).toBe(2);
    expect(summary.averageHeartRate).toBeCloseTo(150);
    expect(summary.maxHeartRate).toBe(160);
    expect(summary.averagePace).toBeCloseTo(2.0);
  });

  it("returns null averages for empty array", () => {
    const summary = summarizeTelemetry([], 0, 0);
    expect(summary.averageHeartRate).toBeNull();
    expect(summary.averagePace).toBeNull();
    expect(summary.maxHeartRate).toBeNull();
  });

  it("handles single point", () => {
    const summary = summarizeTelemetry([makePoint()], 500, 60000);
    expect(summary.pointCount).toBe(1);
    expect(summary.dataQualityScore).toBe(0);
  });

  it("handles missing HR values", () => {
    const points: SessionPoint[] = [
      makePoint({ heartRate: null }),
      makePoint({ heartRate: null })
    ];
    const summary = summarizeTelemetry(points, 200, 60000);
    expect(summary.averageHeartRate).toBeNull();
    expect(summary.maxHeartRate).toBeNull();
  });
});

describe("getElevationGain", () => {
  it("accumulates ascending elevation", () => {
    const points: SessionPoint[] = [
      makePoint({ elevation: 100 }),
      makePoint({ elevation: 110 }),
      makePoint({ elevation: 120 })
    ];
    expect(getElevationGain(points)).toBe(20);
  });

  it("ignores descending elevation", () => {
    const points: SessionPoint[] = [
      makePoint({ elevation: 120 }),
      makePoint({ elevation: 100 })
    ];
    expect(getElevationGain(points)).toBe(0);
  });

  it("returns 0 for flat route", () => {
    const points: SessionPoint[] = [
      makePoint({ elevation: 50 }),
      makePoint({ elevation: 50 })
    ];
    expect(getElevationGain(points)).toBe(0);
  });

  it("handles mixed ascent and descent", () => {
    const points: SessionPoint[] = [
      makePoint({ elevation: 100 }),
      makePoint({ elevation: 115 }),
      makePoint({ elevation: 110 }),
      makePoint({ elevation: 125 })
    ];
    expect(getElevationGain(points)).toBe(30);
  });

  it("skips null elevations", () => {
    const points: SessionPoint[] = [
      makePoint({ elevation: 100 }),
      makePoint({ elevation: null }),
      makePoint({ elevation: 110 })
    ];
    expect(getElevationGain(points)).toBe(0);
  });
});

describe("countPacketLossEvents", () => {
  it("returns 0 for evenly-spaced points", () => {
    const points: SessionPoint[] = [
      makePoint({ timestamp: 1000 }),
      makePoint({ timestamp: 2000 }),
      makePoint({ timestamp: 3000 })
    ];
    expect(countPacketLossEvents(points)).toBe(0);
  });

  it("counts gaps greater than 2600ms", () => {
    const points: SessionPoint[] = [
      makePoint({ timestamp: 1000 }),
      makePoint({ timestamp: 4000 })
    ];
    expect(countPacketLossEvents(points)).toBe(1);
  });

  it("returns 0 for single point", () => {
    expect(countPacketLossEvents([makePoint()])).toBe(0);
  });
});

describe("getDataQualityScore", () => {
  it("returns 0 for fewer than 2 points", () => {
    expect(getDataQualityScore([])).toBe(0);
    expect(getDataQualityScore([makePoint()])).toBe(0);
  });

  it("returns high score for clean accurate data", () => {
    const points: SessionPoint[] = Array.from({ length: 100 }, (_, i) =>
      makePoint({ timestamp: 1000 + i * 1000, accuracy: 5, heartRate: 150 })
    );
    const score = getDataQualityScore(points, 0);
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it("penalizes weak accuracy points", () => {
    const goodPoints: SessionPoint[] = [
      makePoint({ accuracy: 5, timestamp: 1000 }),
      makePoint({ accuracy: 5, timestamp: 2000 })
    ];
    const weakPoints: SessionPoint[] = [
      makePoint({ accuracy: 30, timestamp: 1000 }),
      makePoint({ accuracy: 30, timestamp: 2000 })
    ];
    expect(getDataQualityScore(goodPoints, 0)).toBeGreaterThan(
      getDataQualityScore(weakPoints, 0)
    );
  });

  it("penalizes high packet loss", () => {
    const points: SessionPoint[] = [
      makePoint({ timestamp: 1000 }),
      makePoint({ timestamp: 2000 })
    ];
    const lowLoss = getDataQualityScore(points, 0);
    const highLoss = getDataQualityScore(points, 5);
    expect(highLoss).toBeLessThan(lowLoss);
  });
});
