import { getDistanceMeters } from "./geo";

describe("getDistanceMeters", () => {
  it("returns 0 for same point", () => {
    expect(getDistanceMeters({ lat: 37.33, lng: -121.88 }, { lat: 37.33, lng: -121.88 })).toBe(0);
  });

  it("calculates known distance between two coordinates", () => {
    // ~111km per degree latitude at equator
    const dist = getDistanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(dist).toBeGreaterThan(110000);
    expect(dist).toBeLessThan(112000);
  });

  it("calculates distance symmetrically", () => {
    const a = { lat: 37.33, lng: -121.88 };
    const b = { lat: 37.34, lng: -121.87 };
    expect(getDistanceMeters(a, b)).toBeCloseTo(getDistanceMeters(b, a), 1);
  });

  it("calculates short distance correctly (~100m)", () => {
    // 0.001 degrees latitude ~= 111m
    const dist = getDistanceMeters(
      { lat: 37.3368, lng: -121.8811 },
      { lat: 37.3378, lng: -121.8811 }
    );
    expect(dist).toBeGreaterThan(100);
    expect(dist).toBeLessThan(120);
  });

  it("returns non-zero for antipodal points", () => {
    const dist = getDistanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 180 });
    expect(dist).toBeGreaterThan(19000000);
  });
});
