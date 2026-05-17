export const DEMO_USER_ID = "demo-user";

export type ActivityMode = "run" | "ride";

export const FIRESTORE_COLLECTIONS = {
  sessions: "sessions"
} as const;

export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric"
};

export const MOCK_HEART_RATE = {
  amplitude: 17.5,
  behindDriftPerSecond: 0.5,
  floor: 140,
  positiveDriftPerSecond: 0.3,
  recoveryAfterHighMs: 20000,
  recoveryTarget: 169,
  startBpm: 155,
  updateIntervalMs: 1000,
  upperCap: 185,
  wavePeriodSeconds: 12
} as const;

export const DEMO_USER_PROFILE = {
  age: 28,
  estimatedMaxHeartRate: 192,
  name: "Demo Athlete",
  targetDistanceMeters: 5000,
  targetPaceMinPerKm: 5.2,
  weightKg: 72
} as const;

export const TRAINING_GOALS = {
  rideTargetPaceMinPerKm: 2.35,
  runTargetPaceMinPerKm: 5.2,
  safetyHeartRateCeiling: 185,
  targetFinishBufferSeconds: 18
} as const;

export const BIO_GUARD_CONFIG = {
  pauseThreshold: 185,
  resumeThreshold: 170
} as const;

export const COACHING_CONFIG = {
  defaultWeatherWindMph: 7,
  lookaheadMs: 45000,
  minIntervalMs: 15000
} as const;

export const HEART_RATE_ZONES = {
  easyMaxPct: 0.72,
  tempoMaxPct: 0.84,
  thresholdMaxPct: 0.92,
  dangerMinPct: 0.96
} as const;

export const GPS_CONFIG = {
  packetLossGapMs: 2600,
  weakAccuracyMeters: 20
} as const;

export const ROUTE_DRAW_CONFIG = {
  durationMs: 1500,
  minIntervalMs: 16
} as const;

export const DEMO_ROUTE_CONFIG = {
  baseLat: 37.3368,
  baseLng: -121.8811,
  rideDurationMs: 7 * 60 * 1000,
  runDurationMs: 12 * 60 * 1000,
  telemetryIntervalMs: 1000
} as const;
