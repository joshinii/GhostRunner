import { ghostPosition, GhostPoint } from "./ghostEngine";

const samplePoints: GhostPoint[] = [
  { lat: 10, lng: 20, timestamp: 1000 },
  { lat: 20, lng: 40, timestamp: 3000 },
  { lat: 30, lng: 60, timestamp: 5000 }
];

describe("ghostPosition", () => {
  it("throws when points is empty", () => {
    expect(() => ghostPosition([], 0)).toThrow("ghostPosition requires at least one point");
  });

  it("returns first point when only one point or elapsedMs <= 0", () => {
    const single: GhostPoint[] = [{ lat: 1, lng: 2, timestamp: 5000 }];
    expect(ghostPosition(single, 0)).toEqual({ lat: 1, lng: 2 });
    expect(ghostPosition(single, -100)).toEqual({ lat: 1, lng: 2 });
  });

  it("caps at last point when elapsed time reaches end of route", () => {
    expect(ghostPosition(samplePoints, 5000)).toEqual({ lat: 30, lng: 60 });
  });

  it("interpolates along first segment", () => {
    expect(ghostPosition(samplePoints, 1000)).toEqual({ lat: 15, lng: 30 });
  });

  it("handles 100+ point arrays with correct binary search", () => {
    const points: GhostPoint[] = Array.from({ length: 150 }, (_, i) => ({
      lat: i,
      lng: i * 2,
      timestamp: i * 1000
    }));
    const result = ghostPosition(points, 50000);
    expect(result.lat).toBeCloseTo(50);
    expect(result.lng).toBeCloseTo(100);
  });

  it("returns exact point when elapsed time lands on a boundary", () => {
    // points[0].timestamp=1000, so elapsed=2000 → target=3000 which is exactly points[1]
    const result = ghostPosition(samplePoints, 2000);
    expect(result).toEqual({ lat: 20, lng: 40 });
  });

  it("handles very small time differences between points", () => {
    const tinyPoints: GhostPoint[] = [
      { lat: 0, lng: 0, timestamp: 0 },
      { lat: 1, lng: 1, timestamp: 1 }
    ];
    const result = ghostPosition(tinyPoints, 0);
    expect(result.lat).toBeCloseTo(0);
  });

  it("handles two points with identical timestamps gracefully", () => {
    const dupPoints: GhostPoint[] = [
      { lat: 5, lng: 10, timestamp: 1000 },
      { lat: 5, lng: 10, timestamp: 1000 }
    ];
    expect(() => ghostPosition(dupPoints, 500)).not.toThrow();
  });
});
