import type { SessionPoint } from "../services/sessions";
import type { Session } from "../services/sessions";

export type WeeklyTrend = {
  avgHrTrend: number | null;
  avgPaceImprovement: number | null;
  isoWeek: string;
  sessionCount: number;
  totalDistanceMeters: number;
};

export type PaceZoneDistribution = {
  easy: number;
  recovery: number;
  tempo: number;
  threshold: number;
  vo2max: number;
};

export function smoothGPSPoints(points: SessionPoint[]): SessionPoint[] {
  if (points.length === 0) return [];

  // Filter out low-accuracy points
  const filtered = points.filter(
    (p) => typeof p.accuracy !== "number" || p.accuracy <= 50
  );

  if (filtered.length === 0) return [];

  // Exponential moving average on lat/lng
  const alpha = 0.3;
  const smoothed: SessionPoint[] = [filtered[0]];

  for (let i = 1; i < filtered.length; i++) {
    const prev = smoothed[i - 1];
    const curr = filtered[i];

    // Interpolate gap > 3 seconds by inserting a midpoint
    if (curr.timestamp - prev.timestamp > 3000) {
      const mid: SessionPoint = {
        ...prev,
        lat: (prev.lat + curr.lat) / 2,
        lng: (prev.lng + curr.lng) / 2,
        timestamp: Math.round((prev.timestamp + curr.timestamp) / 2)
      };
      smoothed.push(mid);
    }

    smoothed.push({
      ...curr,
      lat: alpha * curr.lat + (1 - alpha) * prev.lat,
      lng: alpha * curr.lng + (1 - alpha) * prev.lng
    });
  }

  return smoothed;
}

export function computeWeeklyTrends(sessions: Session[]): WeeklyTrend[] {
  const byWeek = new Map<string, Session[]>();

  for (const session of sessions) {
    const week = getISOWeek(session.startedAt);
    const bucket = byWeek.get(week) ?? [];
    bucket.push(session);
    byWeek.set(week, bucket);
  }

  return Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([isoWeek, weekSessions]) => {
      const totalDistanceMeters = weekSessions.reduce((sum, s) => sum + s.distance, 0);
      const paces = weekSessions
        .map((s) => s.summary?.averagePace)
        .filter((p): p is number => typeof p === "number");
      const hrs = weekSessions
        .map((s) => s.summary?.averageHeartRate)
        .filter((h): h is number => typeof h === "number");

      const avgPaceImprovement =
        paces.length > 1 ? paces[paces.length - 1] - paces[0] : null;
      const avgHrTrend =
        hrs.length > 1 ? hrs[hrs.length - 1] - hrs[0] : null;

      return {
        avgHrTrend,
        avgPaceImprovement,
        isoWeek,
        sessionCount: weekSessions.length,
        totalDistanceMeters
      };
    });
}

export function computePaceZoneDistribution(points: SessionPoint[]): PaceZoneDistribution {
  const pacePoints = points.filter(
    (p): p is SessionPoint & { pace: number } => typeof p.pace === "number" && p.pace > 0
  );

  const total = pacePoints.length;

  if (total === 0) {
    return { easy: 0, recovery: 0, tempo: 0, threshold: 0, vo2max: 0 };
  }

  let recovery = 0, easy = 0, tempo = 0, threshold = 0, vo2max = 0;

  for (const p of pacePoints) {
    if (p.pace > 7.0) recovery++;
    else if (p.pace > 6.0) easy++;
    else if (p.pace > 5.0) tempo++;
    else if (p.pace > 4.0) threshold++;
    else vo2max++;
  }

  return {
    easy: easy / total,
    recovery: recovery / total,
    tempo: tempo / total,
    threshold: threshold / total,
    vo2max: vo2max / total
  };
}

function getISOWeek(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNumber = Math.ceil(
    ((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${year}-W${weekNumber.toString().padStart(2, "0")}`;
}
