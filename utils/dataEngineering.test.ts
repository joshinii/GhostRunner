import { smoothGPSPoints, computeWeeklyTrends, computePaceZoneDistribution } from "./dataEngineering";
import type { SessionPoint } from "../services/sessions";
import type { Session } from "../services/sessions";

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

describe("smoothGPSPoints", () => {
  it("returns empty array for empty input", () => {
    expect(smoothGPSPoints([])).toEqual([]);
  });

  it("filters out low-accuracy outliers (accuracy > 50)", () => {
    const points: SessionPoint[] = [
      makePoint({ accuracy: 5 }),
      makePoint({ accuracy: 100, lat: 99, lng: 99 }),
      makePoint({ accuracy: 5 })
    ];
    const result = smoothGPSPoints(points);
    expect(result.every((p) => p.lat !== 99)).toBe(true);
  });

  it("applies smoothing so consecutive lat/lng values are not identical to raw", () => {
    const points: SessionPoint[] = [
      makePoint({ lat: 37.33, lng: -121.88, timestamp: 1000 }),
      makePoint({ lat: 37.34, lng: -121.87, timestamp: 2000 }),
      makePoint({ lat: 37.35, lng: -121.86, timestamp: 3000 })
    ];
    const result = smoothGPSPoints(points);
    // After EMA smoothing, point 2 lat should be between raw values
    expect(result[1].lat).toBeGreaterThan(37.33);
    expect(result[1].lat).toBeLessThan(37.34);
  });

  it("interpolates gaps > 3 seconds by inserting a midpoint", () => {
    const points: SessionPoint[] = [
      makePoint({ timestamp: 1000 }),
      makePoint({ timestamp: 6000 })
    ];
    const result = smoothGPSPoints(points);
    expect(result.length).toBe(3);
    expect(result[1].timestamp).toBe(3500);
  });

  it("passes through single-point arrays", () => {
    const points: SessionPoint[] = [makePoint({ lat: 37.33, lng: -121.88 })];
    const result = smoothGPSPoints(points);
    expect(result).toHaveLength(1);
  });
});

describe("computeWeeklyTrends", () => {
  it("returns empty array for no sessions", () => {
    expect(computeWeeklyTrends([])).toEqual([]);
  });

  it("groups sessions into ISO weeks", () => {
    const sessions: Session[] = [
      { id: "1", startedAt: new Date("2026-05-01").getTime(), distance: 5000, duration: 1800000, points: [], mode: "run", source: "recorded", syncStatus: "synced", title: "Run", userId: "u", summary: { averageHeartRate: 155, averagePace: 5.2, averageSpeed: 3.2, dataQualityScore: 90, elevationGain: 20, maxHeartRate: 170, packetLossEvents: 0, pointCount: 100 }, raceResults: [] },
      { id: "2", startedAt: new Date("2026-05-08").getTime(), distance: 6000, duration: 2100000, points: [], mode: "run", source: "recorded", syncStatus: "synced", title: "Run", userId: "u", summary: { averageHeartRate: 150, averagePace: 5.0, averageSpeed: 3.3, dataQualityScore: 92, elevationGain: 25, maxHeartRate: 168, packetLossEvents: 0, pointCount: 120 }, raceResults: [] }
    ];
    const trends = computeWeeklyTrends(sessions);
    expect(trends.length).toBe(2);
    expect(trends[0].totalDistanceMeters).toBe(5000);
    expect(trends[1].totalDistanceMeters).toBe(6000);
  });
});

describe("computePaceZoneDistribution", () => {
  it("returns all zeros for empty points", () => {
    const dist = computePaceZoneDistribution([]);
    expect(dist.recovery).toBe(0);
    expect(dist.easy).toBe(0);
    expect(dist.tempo).toBe(0);
    expect(dist.threshold).toBe(0);
    expect(dist.vo2max).toBe(0);
  });

  it("zones sum to 1 for non-empty points", () => {
    const points: SessionPoint[] = [
      makePoint({ pace: 8.0 }),
      makePoint({ pace: 6.5 }),
      makePoint({ pace: 5.5 }),
      makePoint({ pace: 4.5 }),
      makePoint({ pace: 3.5 })
    ];
    const dist = computePaceZoneDistribution(points);
    const total = dist.recovery + dist.easy + dist.tempo + dist.threshold + dist.vo2max;
    expect(total).toBeCloseTo(1.0);
  });

  it("assigns slow pace to recovery zone", () => {
    const points: SessionPoint[] = [makePoint({ pace: 8.0 }), makePoint({ pace: 9.0 })];
    const dist = computePaceZoneDistribution(points);
    expect(dist.recovery).toBe(1.0);
  });

  it("ignores null pace points", () => {
    const points: SessionPoint[] = [
      makePoint({ pace: null }),
      makePoint({ pace: 5.5 })
    ];
    const dist = computePaceZoneDistribution(points);
    expect(dist.tempo).toBe(1.0);
  });
});
