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
});
