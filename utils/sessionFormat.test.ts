import {
  formatPace,
  formatHeartRate,
  formatSessionDistance,
  formatSessionDuration,
  formatElevation
} from "./sessionFormat";

describe("formatPace", () => {
  it("returns -- for null", () => {
    expect(formatPace(null)).toBe("--");
  });

  it("returns -- for undefined", () => {
    expect(formatPace(undefined)).toBe("--");
  });

  it("returns -- for zero", () => {
    expect(formatPace(0)).toBe("--");
  });

  it("returns -- for negative", () => {
    expect(formatPace(-1)).toBe("--");
  });

  it("formats valid pace", () => {
    expect(formatPace(5.2)).toBe("5.2 min/km");
  });

  it("formats pace with one decimal", () => {
    expect(formatPace(4.0)).toBe("4.0 min/km");
  });
});

describe("formatHeartRate", () => {
  it("returns -- for null", () => {
    expect(formatHeartRate(null)).toBe("--");
  });

  it("returns -- for undefined", () => {
    expect(formatHeartRate(undefined)).toBe("--");
  });

  it("formats valid heart rate", () => {
    expect(formatHeartRate(155)).toBe("155 bpm");
  });

  it("rounds decimal heart rate", () => {
    expect(formatHeartRate(155.7)).toBe("156 bpm");
  });
});

describe("formatSessionDistance", () => {
  it("converts meters to km with 2 decimals", () => {
    expect(formatSessionDistance(5000)).toBe("5.00 km");
  });

  it("handles sub-km distance", () => {
    expect(formatSessionDistance(750)).toBe("0.75 km");
  });

  it("handles zero", () => {
    expect(formatSessionDistance(0)).toBe("0.00 km");
  });
});

describe("formatSessionDuration", () => {
  it("formats zero duration", () => {
    expect(formatSessionDuration(0)).toBe("00:00");
  });

  it("formats one minute", () => {
    expect(formatSessionDuration(60000)).toBe("01:00");
  });

  it("formats 30 seconds", () => {
    expect(formatSessionDuration(30000)).toBe("00:30");
  });

  it("formats 1 hour 5 minutes 3 seconds", () => {
    expect(formatSessionDuration((65 * 60 + 3) * 1000)).toBe("65:03");
  });

  it("pads single-digit minutes and seconds", () => {
    expect(formatSessionDuration(9 * 60000 + 5000)).toBe("09:05");
  });
});

describe("formatElevation", () => {
  it("returns -- for null", () => {
    expect(formatElevation(null)).toBe("--");
  });

  it("returns -- for undefined", () => {
    expect(formatElevation(undefined)).toBe("--");
  });

  it("formats valid elevation", () => {
    expect(formatElevation(42.7)).toBe("43 m");
  });

  it("formats zero elevation", () => {
    expect(formatElevation(0)).toBe("0 m");
  });
});
