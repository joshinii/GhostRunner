import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  where
} from "firebase/firestore";

import { DEMO_USER_ID, FIRESTORE_COLLECTIONS } from "../constants/config";
import { db } from "./firebase";

export type SessionPoint = {
  lat: number;
  lng: number;
  timestamp: number;
  pace: number | null;
};

type SaveSessionInput = {
  startedAt: number;
  distance: number;
  duration: number;
  points: SessionPoint[];
};

export type Session = SaveSessionInput & {
  id: string;
  userId: string;
};

const sessionsCollection = collection(db, FIRESTORE_COLLECTIONS.sessions);

export async function saveSession(input: SaveSessionInput): Promise<string> {
  console.log("[GhostStrategist] sessions save started", {
    distance: input.distance,
    duration: input.duration,
    pointCount: input.points.length,
    userId: DEMO_USER_ID
  });

  const docRef = await addDoc(sessionsCollection, {
    userId: DEMO_USER_ID,
    startedAt: input.startedAt,
    distance: input.distance,
    duration: input.duration,
    points: input.points
  });

  console.log("[GhostStrategist] sessions save finished", {
    sessionId: docRef.id
  });

  return docRef.id;
}

export async function getSessions(): Promise<Session[]> {
  console.log("[GhostStrategist] sessions query started", {
    orderBy: "startedAt desc",
    userId: DEMO_USER_ID
  });

  const snapshot = await getDocs(
    query(
      sessionsCollection,
      where("userId", "==", DEMO_USER_ID),
      orderBy("startedAt", "desc")
    )
  );

  const sessions = snapshot.docs.map((doc) => {
    const data = doc.data() as Omit<Session, "id">;

    return {
      ...data,
      id: doc.id
    };
  });

  console.log("[GhostStrategist] sessions query finished", {
    count: sessions.length
  });

  return sessions;
}
