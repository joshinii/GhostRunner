import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where
} from "firebase/firestore";

import type { ActivityMode } from "../constants/config";
import { DEMO_USER_ID, FIRESTORE_COLLECTIONS } from "../constants/config";
import { summarizeTelemetry, SessionSummary } from "../utils/raceAnalytics";
import { db } from "./firebase";

export type SyncStatus = "synced" | "pending";
export type SessionSource = "recorded" | "demo" | "imported";

export type SessionPoint = {
  accuracy?: number;
  cadence?: number | null;
  elevation?: number | null;
  heartRate?: number | null;
  lat: number;
  lng: number;
  pace: number | null;
  speed?: number | null;
  timestamp: number;
};

export type TrainingGoalSnapshot = {
  targetDistanceMeters: number;
  targetPaceMinPerKm: number;
  targetTimeMs: number;
};

export type WeatherSnapshot = {
  condition: string;
  temperatureF: number;
  windMph: number;
};

export type CoachingEvent = {
  elapsedMs: number;
  gapMeters: number;
  heartRate: number;
  id: string;
  instruction: string;
  projectedFinishMs: number;
  reason: string;
  safetyOverride: boolean;
  severity: "info" | "push" | "hold" | "recover" | "danger" | "caution" | "warning";
  snapshotAtEvent?: {
    elevationAhead: number;
    gapMeters: number;
    heartRate: number;
    pace: number;
  };
  timestamp: number;
  toolUsed: string;
};

export type RaceResultSummary = {
  averagePace: number | null;
  coachingEventCount: number;
  completedAt: number;
  finalGapMeters: number | null;
  userTimeMs: number;
};

export type SaveSessionInput = {
  coachingEvents?: CoachingEvent[];
  distance: number;
  duration: number;
  goal?: TrainingGoalSnapshot;
  mode?: ActivityMode;
  points: SessionPoint[];
  raceResults?: RaceResultSummary[];
  source?: SessionSource;
  startedAt: number;
  summary?: SessionSummary;
  title?: string;
  weather?: WeatherSnapshot;
};

export type Session = SaveSessionInput & {
  id: string;
  mode: ActivityMode;
  source: SessionSource;
  summary: SessionSummary;
  syncStatus: SyncStatus;
  title: string;
  userId: string;
};

const sessionsCollection = collection(db, FIRESTORE_COLLECTIONS.sessions);
let localSessions: Session[] = [];

export async function saveSession(input: SaveSessionInput): Promise<string> {
  const sessionBody = normalizeSessionBody(input);

  console.log("[GhostStrategist] sessions save started", {
    distance: sessionBody.distance,
    duration: sessionBody.duration,
    pointCount: sessionBody.points.length,
    source: sessionBody.source,
    userId: DEMO_USER_ID
  });

  try {
    const docRef = await addDoc(sessionsCollection, {
      ...sessionBody,
      syncStatus: "synced",
      userId: DEMO_USER_ID
    });

    console.log("[GhostStrategist] sessions save finished", {
      sessionId: docRef.id
    });

    return docRef.id;
  } catch (error) {
    const localId = `local-${Date.now()}`;
    const localSession: Session = {
      ...sessionBody,
      id: localId,
      syncStatus: "pending",
      userId: DEMO_USER_ID
    };

    localSessions = [localSession, ...localSessions];
    console.log("[GhostStrategist] sessions saved locally after Firebase failure", {
      error,
      sessionId: localId
    });

    return localId;
  }
}

export async function getSessions(): Promise<Session[]> {
  console.log("[GhostStrategist] sessions query started", {
    orderBy: "startedAt desc",
    userId: DEMO_USER_ID
  });

  try {
    const snapshot = await getDocs(
      query(
        sessionsCollection,
        where("userId", "==", DEMO_USER_ID),
        orderBy("startedAt", "desc")
      )
    );

    const remoteSessions = snapshot.docs.map((remoteDoc) =>
      normalizeSession(remoteDoc.id, remoteDoc.data())
    );
    const merged = mergeSessions(remoteSessions, localSessions);

    console.log("[GhostStrategist] sessions query finished", {
      count: merged.length
    });

    return merged;
  } catch (error) {
    console.log("[GhostStrategist] sessions query using local fallback", {
      error,
      localCount: localSessions.length
    });

    return [...localSessions].sort((a, b) => b.startedAt - a.startedAt);
  }
}

export async function saveRaceResult(
  sessionId: string,
  result: RaceResultSummary,
  coachingEvents: CoachingEvent[]
): Promise<void> {
  localSessions = localSessions.map((session) =>
    session.id === sessionId
      ? {
          ...session,
          coachingEvents,
          raceResults: [...(session.raceResults ?? []), result]
        }
      : session
  );

  if (sessionId.startsWith("local-")) {
    return;
  }

  try {
    await updateDoc(doc(db, FIRESTORE_COLLECTIONS.sessions, sessionId), {
      coachingEvents,
      raceResults: [result]
    });
  } catch (error) {
    console.log("[GhostStrategist] race result stored in local fallback", {
      error,
      sessionId
    });
  }
}

function normalizeSessionBody(input: SaveSessionInput): Omit<Session, "id" | "syncStatus" | "userId"> {
  const mode = input.mode ?? "run";
  const source = input.source ?? "recorded";
  const points = input.points.map(normalizePoint);
  const title =
    input.title ??
    `${source === "demo" ? "Demo" : "Recorded"} ${mode === "ride" ? "Ride" : "Run"}`;

  return {
    coachingEvents: input.coachingEvents ?? [],
    distance: input.distance,
    duration: input.duration,
    goal: input.goal,
    mode,
    points,
    raceResults: input.raceResults ?? [],
    source,
    startedAt: input.startedAt,
    summary: input.summary ?? summarizeTelemetry(points, input.distance, input.duration),
    title,
    weather: input.weather
  };
}

function normalizeSession(id: string, rawData: unknown): Session {
  const data = rawData as Partial<Session>;
  const points = (data.points ?? []).map(normalizePoint);
  const distance = typeof data.distance === "number" ? data.distance : 0;
  const duration = typeof data.duration === "number" ? data.duration : 0;
  const mode = data.mode ?? "run";
  const source = data.source ?? "recorded";

  return {
    coachingEvents: data.coachingEvents ?? [],
    distance,
    duration,
    goal: data.goal,
    id,
    mode,
    points,
    raceResults: data.raceResults ?? [],
    source,
    startedAt: typeof data.startedAt === "number" ? data.startedAt : Date.now(),
    summary: data.summary ?? summarizeTelemetry(points, distance, duration),
    syncStatus: data.syncStatus ?? "synced",
    title:
      data.title ??
      `${source === "demo" ? "Demo" : "Recorded"} ${mode === "ride" ? "Ride" : "Run"}`,
    userId: data.userId ?? DEMO_USER_ID,
    weather: data.weather
  };
}

function normalizePoint(point: SessionPoint): SessionPoint {
  return {
    accuracy: point.accuracy,
    cadence: point.cadence ?? null,
    elevation: point.elevation ?? null,
    heartRate: point.heartRate ?? null,
    lat: point.lat,
    lng: point.lng,
    pace: point.pace ?? null,
    speed: point.speed ?? null,
    timestamp: point.timestamp
  };
}

function mergeSessions(remoteSessions: Session[], pendingSessions: Session[]): Session[] {
  const merged = [...pendingSessions, ...remoteSessions];
  const seen = new Set<string>();

  return merged
    .filter((session) => {
      if (seen.has(session.id)) {
        return false;
      }

      seen.add(session.id);
      return true;
    })
    .sort((a, b) => b.startedAt - a.startedAt);
}
