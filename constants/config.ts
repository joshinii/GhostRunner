export const DEMO_USER_ID = "demo-user";

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

export const BIO_GUARD_CONFIG = {
  pauseThreshold: 185,
  resumeThreshold: 170
} as const;

export const COACHING_CONFIG = {
  minIntervalMs: 15000,
  upcomingElevationDelta: 0
} as const;

export const GPS_CONFIG = {
  weakAccuracyMeters: 20
} as const;

export const ROUTE_DRAW_CONFIG = {
  durationMs: 1500,
  minIntervalMs: 16
} as const;
