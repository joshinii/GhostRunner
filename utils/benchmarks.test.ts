import { benchmarkGhostInterpolation, benchmarkTelemetrySummary } from "./benchmarks";

describe("benchmarkGhostInterpolation", () => {
  it("handles 10K points under 1ms per call", () => {
    const result = benchmarkGhostInterpolation(10000);
    expect(result.avgMs).toBeLessThan(1);
  });

  it("handles 100 points correctly", () => {
    const result = benchmarkGhostInterpolation(100);
    expect(result.avgMs).toBeLessThan(1);
    expect(result.ops).toBeGreaterThan(100);
  });
});

describe("benchmarkTelemetrySummary", () => {
  it("summarizes 1000 points under 10ms average", () => {
    const result = benchmarkTelemetrySummary(1000);
    expect(result.avgMs).toBeLessThan(10);
  });

  it("summarizes 100 points under 5ms average", () => {
    const result = benchmarkTelemetrySummary(100);
    expect(result.avgMs).toBeLessThan(5);
  });
});
