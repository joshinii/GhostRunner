import {
  getHeartRateZone,
  predictFinishTimeMs,
  estimateTimeGapSeconds,
  makeLocalCoachingInstruction,
  AgentSnapshot
} from "./agentTools";

const baseSnapshot: AgentSnapshot = {
  distanceRemaining: 1000,
  elapsedMs: 300000,
  elevationAhead: 0,
  gapMeters: 0,
  heartRate: 150,
  maxHeartRate: 192,
  mode: "run",
  pace: 5.2,
  projectedFinishMs: 420000,
  speed: 3.2,
  targetPace: 5.2,
  timeGapSeconds: 0,
  weatherWindMph: 7
};

describe("getHeartRateZone", () => {
  it("returns easy below tempo threshold", () => {
    expect(getHeartRateZone(130, 192)).toBe("easy");
  });

  it("returns tempo in tempo zone", () => {
    // 0.84 * 192 = 161.28, so 162 is tempo
    expect(getHeartRateZone(162, 192)).toBe("tempo");
  });

  it("returns threshold in threshold zone", () => {
    // 0.92 * 192 = 176.64, so 177 is threshold
    expect(getHeartRateZone(177, 192)).toBe("threshold");
  });

  it("returns danger at or above 96% max HR", () => {
    // 0.96 * 192 = 184.32
    expect(getHeartRateZone(185, 192)).toBe("danger");
  });

  it("returns danger at exactly 96% max HR", () => {
    expect(getHeartRateZone(Math.ceil(0.96 * 192), 192)).toBe("danger");
  });

  it("returns easy at very low HR", () => {
    expect(getHeartRateZone(60, 192)).toBe("easy");
  });

  it("uses default maxHR when not provided", () => {
    expect(getHeartRateZone(140)).toBe("easy");
  });
});

describe("predictFinishTimeMs", () => {
  it("returns elapsed + remaining for flat terrain with no wind", () => {
    const result = predictFinishTimeMs(60000, 1, 5.0, 0, 7);
    // remaining = 5.0 * 60000 * (1/1000) = 300ms
    // terrain penalty = max(0, 0) * 380 = 0
    // wind penalty = max(7 - 10, 0) * 900 = 0
    expect(result).toBe(60000 + 300);
  });

  it("applies uphill penalty", () => {
    const withoutHill = predictFinishTimeMs(0, 1, 5.0, 0, 7);
    const withHill = predictFinishTimeMs(0, 1, 5.0, 5, 7);
    expect(withHill - withoutHill).toBe(5 * 380);
  });

  it("applies wind penalty above 10 mph", () => {
    const noWind = predictFinishTimeMs(0, 1, 5.0, 0, 7);
    const highWind = predictFinishTimeMs(0, 1, 5.0, 0, 15);
    expect(highWind - noWind).toBe((15 - 10) * 900);
  });

  it("returns elapsed when distanceRemaining is zero", () => {
    const result = predictFinishTimeMs(180000, 0, 5.0, 0, 7);
    expect(result).toBe(180000);
  });

  it("uses fallback pace when paceMinPerKm is zero", () => {
    const result = predictFinishTimeMs(0, 1000, 0, 0, 7);
    expect(result).toBeGreaterThan(0);
  });
});

describe("estimateTimeGapSeconds", () => {
  it("returns positive gap when behind", () => {
    // 100m gap at 5 min/km = (100/1000) * 5 * 60 = 30s
    expect(estimateTimeGapSeconds(100, 5.0)).toBe(30);
  });

  it("returns negative gap when ahead", () => {
    expect(estimateTimeGapSeconds(-100, 5.0)).toBe(-30);
  });

  it("returns 0 when pace is zero", () => {
    expect(estimateTimeGapSeconds(100, 0)).toBe(0);
  });

  it("returns 0 when gap is zero", () => {
    expect(estimateTimeGapSeconds(0, 5.0)).toBe(0);
  });
});

describe("makeLocalCoachingInstruction", () => {
  it("returns danger severity when HR is at danger zone", () => {
    const snap: AgentSnapshot = { ...baseSnapshot, heartRate: 186, maxHeartRate: 192 };
    const result = makeLocalCoachingInstruction(snap);
    expect(result.severity).toBe("danger");
    expect(result.safetyOverride).toBe(true);
    expect(result.toolUsed).toBe("Bio-Guard Tool");
  });

  it("returns danger when HR exceeds safetyHeartRateCeiling (185)", () => {
    const snap: AgentSnapshot = { ...baseSnapshot, heartRate: 185, maxHeartRate: 192 };
    const result = makeLocalCoachingInstruction(snap);
    expect(result.severity).toBe("danger");
  });

  it("returns recover when HR is at threshold with elevation ahead", () => {
    // threshold zone: >= 0.92 * 192 = 176.64
    const snap: AgentSnapshot = { ...baseSnapshot, heartRate: 178, maxHeartRate: 192, elevationAhead: 5 };
    const result = makeLocalCoachingInstruction(snap);
    expect(result.severity).toBe("recover");
  });

  it("returns push when significantly behind and HR is controlled", () => {
    const snap: AgentSnapshot = { ...baseSnapshot, heartRate: 155, maxHeartRate: 192, gapMeters: -25 };
    const result = makeLocalCoachingInstruction(snap);
    expect(result.severity).toBe("push");
  });

  it("returns hold on significant elevation ahead", () => {
    const snap: AgentSnapshot = { ...baseSnapshot, heartRate: 150, maxHeartRate: 192, elevationAhead: 8 };
    const result = makeLocalCoachingInstruction(snap);
    expect(result.severity).toBe("hold");
    expect(result.toolUsed).toBe("Upcoming Elevation Scan Tool");
  });

  it("returns hold in high wind", () => {
    const snap: AgentSnapshot = { ...baseSnapshot, weatherWindMph: 16 };
    const result = makeLocalCoachingInstruction(snap);
    expect(result.severity).toBe("hold");
    expect(result.toolUsed).toBe("Terrain and Weather Analyst Tool");
  });

  it("returns default info/hold for balanced state", () => {
    const result = makeLocalCoachingInstruction(baseSnapshot);
    expect(["info", "hold"]).toContain(result.severity);
    expect(result.safetyOverride).toBe(false);
  });
});
