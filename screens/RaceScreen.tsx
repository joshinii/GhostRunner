import {
  RouteProp,
  useNavigation,
  useRoute
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT
} from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CoachingCard from "../components/CoachingCard";
import {
  BIO_GUARD_CONFIG,
  COACHING_CONFIG,
  DEMO_USER_PROFILE,
  GPS_CONFIG,
  ROUTE_DRAW_CONFIG,
  TRAINING_GOALS
} from "../constants/config";
import { useMockHeartRate } from "../hooks/useMockHeartRate";
import { RootStackParamList } from "../navigation/types";
import {
  CoachingInstruction,
  getCoachingInstruction
} from "../services/coaching";
import {
  Coord,
  requestLocationPermission,
  startWatchingLocation
} from "../services/location";
import {
  CoachingEvent,
  RaceResultSummary,
  saveRaceResult
} from "../services/sessions";
import {
  estimateTimeGapSeconds,
  getHeartRateZone,
  predictFinishTimeMs
} from "../utils/agentTools";
import { getDistanceMeters } from "../utils/geo";
import { ghostPosition, GhostPosition } from "../utils/ghostEngine";
import {
  getPointNearElapsed,
  getUpcomingElevationDelta
} from "../utils/raceAnalytics";
import {
  formatPace,
  formatSessionDuration
} from "../utils/sessionFormat";
import { TYPOGRAPHY } from "../theme";

const COUNTDOWN_START = 3;
const REGION_DELTA = 0.01;
const RENDER_INTERVAL_MS = 16;
const HUD_INTERVAL_MS = 1000;
const COACHING_CARD_BOTTOM_SPACING = 12;

type RaceRoute = RouteProp<RootStackParamList, "RaceScreen">;

type HudState = {
  elevationAhead: number;
  elapsedMs: number;
  gapMeters: number | null;
  heartRateZone: string;
  pace: number | null;
  projectedFinishMs: number;
  timeGapSeconds: number;
  totalDistance: number;
};

type RaceResult = RaceResultSummary & {
  ghostTimeMs: number;
};

function formatGap(gapMeters: number | null): string {
  if (gapMeters === null) {
    return "--";
  }

  const sign = gapMeters >= 0 ? "+" : "-";

  return `${sign}${Math.round(Math.abs(gapMeters))} m`;
}

function getSignedGapMeters(
  routeStart: GhostPosition,
  userPosition: Coord | null,
  ghostMarker: GhostPosition | null
): number | null {
  if (userPosition === null || ghostMarker === null) {
    return null;
  }

  const gapDistance = getDistanceMeters(userPosition, ghostMarker);
  const userFromStart = getDistanceMeters(routeStart, userPosition);
  const ghostFromStart = getDistanceMeters(routeStart, ghostMarker);

  return userFromStart >= ghostFromStart ? gapDistance : -gapDistance;
}

function getAveragePace(elapsedMs: number, distanceMeters: number): number | null {
  if (distanceMeters < 1) {
    return null;
  }

  return elapsedMs / 60000 / (distanceMeters / 1000);
}

function getTargetPace(sessionMode: "run" | "ride"): number {
  return sessionMode === "ride"
    ? TRAINING_GOALS.rideTargetPaceMinPerKm
    : TRAINING_GOALS.runTargetPaceMinPerKm;
}

export default function RaceScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RaceRoute>();
  const { session } = params;
  const isDemoRace = session.source === "demo";
  const animationFrameRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentPaceRef = useRef<number | null>(session.summary.averagePace);
  const ghostPausedRef = useRef(false);
  const ghostRef = useRef<GhostPosition | null>(null);
  const ghostElapsedRef = useRef(0);
  const lastCoachingCallRef = useRef(0);
  const lastGhostFrameAtRef = useRef<number | null>(null);
  const lastUserPointRef = useRef<(Coord & { timestamp: number }) | null>(null);
  const mapRef = useRef<MapView>(null);
  const raceActiveRef = useRef(false);
  const raceEndedRef = useRef(false);
  const raceStartRef = useRef<number | null>(null);
  const renderTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const routeDrawIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hudIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simulatedHRRef = useRef(155);
  const totalDistanceRef = useRef(0);
  const userCoordRef = useRef<Coord | null>(null);
  const coachingEventsRef = useRef<CoachingEvent[]>([]);
  const [coachingEvents, setCoachingEvents] = useState<CoachingEvent[]>([]);
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [drawnRouteCount, setDrawnRouteCount] = useState(0);
  const [ghostMarkerTick, setGhostMarkerTick] = useState(0);
  const [hud, setHud] = useState<HudState>({
    elevationAhead: 0,
    elapsedMs: 0,
    gapMeters: null,
    heartRateZone: "easy",
    pace: session.summary.averagePace,
    projectedFinishMs: session.duration,
    timeGapSeconds: 0,
    totalDistance: 0
  });
  const [isBioGuardPaused, setIsBioGuardPaused] = useState(false);
  const [isRacing, setIsRacing] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [latestCoaching, setLatestCoaching] =
    useState<CoachingInstruction | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [raceResult, setRaceResult] = useState<RaceResult | null>(null);
  const [raceVersion, setRaceVersion] = useState(0);
  const [userCoord, setUserCoord] = useState<Coord | null>(null);
  const bpm = useMockHeartRate({
    gapMeters: hud.gapMeters
  });
  const points = session.points;

  useEffect(() => {
    const loadingTick = setTimeout(() => {
      console.log("[GhostStrategist] RaceScreen session loaded", {
        isDemoRace,
        pointCount: points.length,
        sessionId: session.id
      });
      setIsSessionLoading(false);
    }, 0);

    return () => {
      clearTimeout(loadingTick);
    };
  }, [isDemoRace, points.length, session.id]);

  useEffect(() => {
    simulatedHRRef.current = bpm;
  }, [bpm]);

  const handleCoachingDismiss = useCallback(() => {
    setLatestCoaching(null);
  }, []);

  async function maybeRequestCoaching(
    elapsedMs: number,
    gapMeters: number | null,
    projectedFinishMs: number,
    elevationAhead: number,
    force = false
  ) {
    const now = Date.now();

    if (!force && now - lastCoachingCallRef.current < COACHING_CONFIG.minIntervalMs) {
      return;
    }

    lastCoachingCallRef.current = now;

    const pace = currentPaceRef.current ?? session.summary.averagePace ?? getTargetPace(session.mode);
    const timeGapSeconds = estimateTimeGapSeconds(gapMeters ?? 0, pace);
    const snapshot = {
      distanceRemaining: Math.max(session.distance - totalDistanceRef.current, 0),
      elapsedMs,
      elevationAhead,
      gapMeters: gapMeters ?? 0,
      heartRate: simulatedHRRef.current,
      maxHeartRate: DEMO_USER_PROFILE.estimatedMaxHeartRate,
      mode: session.mode,
      pace,
      projectedFinishMs,
      speed: pace > 0 ? 1000 / (pace * 60) : 0,
      targetPace: session.goal?.targetPaceMinPerKm ?? getTargetPace(session.mode),
      timeGapSeconds,
      weatherWindMph: session.weather?.windMph ?? COACHING_CONFIG.defaultWeatherWindMph
    };

    console.log("[GhostStrategist] RaceScreen coaching snapshot built", snapshot);

    const instruction = await getCoachingInstruction(snapshot);
    const coachingEvent: CoachingEvent = {
      elapsedMs,
      gapMeters: snapshot.gapMeters,
      heartRate: snapshot.heartRate,
      id: `${session.id}-${now}`,
      instruction: instruction.instruction,
      projectedFinishMs,
      reason: instruction.reason,
      safetyOverride: instruction.safetyOverride,
      severity: instruction.severity,
      timestamp: now,
      toolUsed: instruction.toolUsed
    };

    coachingEventsRef.current = [...coachingEventsRef.current, coachingEvent];
    setCoachingEvents(coachingEventsRef.current);
    setLatestCoaching(instruction);
  }

  function stopGhostAnimation() {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }

  function startGhostAnimation() {
    stopGhostAnimation();
    lastGhostFrameAtRef.current = Date.now();

    const animate = () => {
      const now = Date.now();
      const previousFrameAt = lastGhostFrameAtRef.current ?? now;

      if (!ghostPausedRef.current) {
        ghostElapsedRef.current += now - previousFrameAt;
        ghostRef.current = ghostPosition(points, ghostElapsedRef.current);
      }

      lastGhostFrameAtRef.current = now;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }

  function pauseGhostForBioGuard() {
    if (ghostPausedRef.current || raceEndedRef.current) {
      return;
    }

    ghostPausedRef.current = true;
    stopGhostAnimation();
    setIsBioGuardPaused(true);
    void maybeRequestCoaching(
      hud.elapsedMs,
      hud.gapMeters,
      hud.projectedFinishMs,
      hud.elevationAhead,
      true
    );
  }

  function resumeGhostAfterBioGuard() {
    if (!ghostPausedRef.current || raceEndedRef.current) {
      return;
    }

    ghostPausedRef.current = false;
    setIsBioGuardPaused(false);
    startGhostAnimation();
  }

  function stopRaceLoops() {
    raceActiveRef.current = false;
    stopGhostAnimation();

    if (renderTickRef.current !== null) {
      clearInterval(renderTickRef.current);
      renderTickRef.current = null;
    }

    if (hudIntervalRef.current !== null) {
      clearInterval(hudIntervalRef.current);
      hudIntervalRef.current = null;
    }

    if (routeDrawIntervalRef.current !== null) {
      clearInterval(routeDrawIntervalRef.current);
      routeDrawIntervalRef.current = null;
    }
  }

  function startRouteDraw() {
    if (routeDrawIntervalRef.current !== null) {
      clearInterval(routeDrawIntervalRef.current);
    }

    setDrawnRouteCount(Math.min(points.length, 1));

    if (points.length < 2) {
      return;
    }

    const intervalMs = Math.max(
      ROUTE_DRAW_CONFIG.minIntervalMs,
      Math.floor(ROUTE_DRAW_CONFIG.durationMs / points.length)
    );

    routeDrawIntervalRef.current = setInterval(() => {
      setDrawnRouteCount((current) => {
        const nextCount = Math.min(points.length, current + 1);

        if (nextCount >= points.length && routeDrawIntervalRef.current !== null) {
          clearInterval(routeDrawIntervalRef.current);
          routeDrawIntervalRef.current = null;
        }

        return nextCount;
      });
    }, intervalMs);
  }

  function finishRace(elapsedMs: number, gapMeters: number | null) {
    if (raceEndedRef.current) {
      return;
    }

    const finalElapsedMs = Math.min(elapsedMs, session.duration);
    const averagePace = getAveragePace(finalElapsedMs, totalDistanceRef.current);
    const result: RaceResult = {
      averagePace,
      coachingEventCount: coachingEventsRef.current.length,
      completedAt: Date.now(),
      finalGapMeters: gapMeters,
      ghostTimeMs: session.duration,
      userTimeMs: finalElapsedMs
    };

    raceEndedRef.current = true;
    stopRaceLoops();
    setIsRacing(false);
    setRaceResult(result);
    void saveRaceResult(session.id, result, coachingEventsRef.current);
  }

  function handleRaceAgain() {
    stopRaceLoops();
    raceEndedRef.current = false;
    raceStartRef.current = null;
    currentPaceRef.current = session.summary.averagePace;
    ghostElapsedRef.current = 0;
    ghostPausedRef.current = false;
    totalDistanceRef.current = 0;
    lastCoachingCallRef.current = 0;
    lastUserPointRef.current = null;
    coachingEventsRef.current = [];
    ghostRef.current = {
      lat: points[0].lat,
      lng: points[0].lng
    };
    setCoachingEvents([]);
    setCountdown(COUNTDOWN_START);
    setDrawnRouteCount(0);
    setGhostMarkerTick(0);
    setIsBioGuardPaused(false);
    setHud({
      elevationAhead: 0,
      elapsedMs: 0,
      gapMeters: null,
      heartRateZone: "easy",
      pace: session.summary.averagePace,
      projectedFinishMs: session.duration,
      timeGapSeconds: 0,
      totalDistance: 0
    });
    setIsRacing(false);
    setLatestCoaching(null);
    setRaceResult(null);
    setRaceVersion((current) => current + 1);
  }

  function handleBackHome() {
    stopRaceLoops();
    navigation.navigate("HomeScreen");
  }

  useEffect(() => {
    if (isDemoRace) {
      const firstPoint = points[0];

      if (firstPoint) {
        const demoCoord = toCoord(firstPoint);
        userCoordRef.current = demoCoord;
        setUserCoord(demoCoord);
      }

      return undefined;
    }

    let cleanup: (() => void) | undefined;
    let mounted = true;

    void requestLocationPermission().then((granted) => {
      if (!mounted) {
        return;
      }

      if (!granted) {
        setPermissionDenied(true);
        return;
      }

      cleanup = startWatchingLocation((nextCoord) => {
        userCoordRef.current = nextCoord;
        setUserCoord(nextCoord);
        mapRef.current?.animateToRegion({
          latitude: nextCoord.lat,
          latitudeDelta: REGION_DELTA,
          longitude: nextCoord.lng,
          longitudeDelta: REGION_DELTA
        });

        if (!raceActiveRef.current) {
          return;
        }

        const timestamp = Date.now();
        const previousPoint = lastUserPointRef.current;

        if (previousPoint !== null) {
          const distanceDelta = getDistanceMeters(previousPoint, nextCoord);
          const timeDeltaMs = timestamp - previousPoint.timestamp;

          if (timeDeltaMs >= 1000 && distanceDelta >= 1) {
            totalDistanceRef.current += distanceDelta;
            currentPaceRef.current = timeDeltaMs / 60000 / (distanceDelta / 1000);
          }
        }

        lastUserPointRef.current = {
          ...nextCoord,
          timestamp
        };
      });
    });

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [isDemoRace, points]);

  useEffect(() => {
    if (!isRacing || raceEndedRef.current) {
      return;
    }

    if (bpm >= BIO_GUARD_CONFIG.pauseThreshold) {
      pauseGhostForBioGuard();
      return;
    }

    if (bpm < BIO_GUARD_CONFIG.resumeThreshold) {
      resumeGhostAfterBioGuard();
    }
  }, [bpm, isRacing]);

  useEffect(() => {
    if (isSessionLoading || points.length === 0) {
      return undefined;
    }

    ghostRef.current = {
      lat: points[0].lat,
      lng: points[0].lng
    };

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((current) => {
        const nextCountdown = current - 1;

        if (nextCountdown <= 0 && countdownIntervalRef.current !== null) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }

        return Math.max(nextCountdown, 0);
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current !== null) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [isSessionLoading, points, raceVersion]);

  useEffect(() => {
    if (isSessionLoading || countdown !== 0 || points.length === 0 || isRacing) {
      return undefined;
    }

    setIsRacing(true);
    raceStartRef.current = Date.now();
    raceActiveRef.current = true;
    raceEndedRef.current = false;
    ghostElapsedRef.current = 0;
    ghostPausedRef.current = false;
    totalDistanceRef.current = 0;
    lastCoachingCallRef.current = 0;
    currentPaceRef.current = session.summary.averagePace;
    lastUserPointRef.current = userCoordRef.current
      ? {
          ...userCoordRef.current,
          timestamp: raceStartRef.current
        }
      : null;

    startGhostAnimation();
    startRouteDraw();
    renderTickRef.current = setInterval(() => {
      setGhostMarkerTick((current) => current + 1);
    }, RENDER_INTERVAL_MS);
    hudIntervalRef.current = setInterval(() => {
      const raceStart = raceStartRef.current;

      if (raceStart === null) {
        return;
      }

      const elapsedMs = Date.now() - raceStart;

      if (isDemoRace) {
        const userElapsed = Math.min(
          elapsedMs * 0.965 + Math.sin(elapsedMs / 14000) * 3500,
          session.duration
        );
        const demoPosition = ghostPosition(points, userElapsed);
        const demoPoint = getPointNearElapsed(points, userElapsed);
        const demoCoord = toCoord({
          ...demoPosition,
          accuracy: 4,
          elevation: demoPoint?.elevation ?? null,
          speed: demoPoint?.speed ?? null
        });

        userCoordRef.current = demoCoord;
        setUserCoord(demoCoord);
        totalDistanceRef.current = Math.min(
          session.distance * (userElapsed / session.duration),
          session.distance
        );
        currentPaceRef.current = demoPoint?.pace ?? session.summary.averagePace;
      }

      const gapMeters = getSignedGapMeters(points[0], userCoordRef.current, ghostRef.current);
      const pace = currentPaceRef.current ?? session.summary.averagePace ?? getTargetPace(session.mode);
      const elevationAhead = getUpcomingElevationDelta(
        points,
        ghostElapsedRef.current,
        COACHING_CONFIG.lookaheadMs
      );
      const projectedFinishMs = predictFinishTimeMs(
        elapsedMs,
        Math.max(session.distance - totalDistanceRef.current, 0),
        pace,
        elevationAhead,
        session.weather?.windMph ?? COACHING_CONFIG.defaultWeatherWindMph
      );
      const timeGapSeconds = estimateTimeGapSeconds(gapMeters ?? 0, pace);

      if (elapsedMs >= session.duration) {
        finishRace(elapsedMs, gapMeters);
        return;
      }

      void maybeRequestCoaching(
        elapsedMs,
        gapMeters,
        projectedFinishMs,
        elevationAhead
      );

      setHud({
        elevationAhead,
        elapsedMs,
        gapMeters,
        heartRateZone: getHeartRateZone(
          simulatedHRRef.current,
          DEMO_USER_PROFILE.estimatedMaxHeartRate
        ),
        pace,
        projectedFinishMs,
        timeGapSeconds,
        totalDistance: totalDistanceRef.current
      });
    }, HUD_INTERVAL_MS);

    return () => {
      stopRaceLoops();
    };
  }, [countdown, isDemoRace, isRacing, isSessionLoading, points, session]);

  if (isSessionLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (permissionDenied && !isDemoRace) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionTitle}>Location permission required.</Text>
        <Pressable onPress={() => void Linking.openSettings()}>
          <Text style={styles.settingsLink}>Open Settings</Text>
        </Pressable>
      </View>
    );
  }

  if (points.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>No route points found.</Text>
      </View>
    );
  }

  const ghostMarker = ghostRef.current;

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={{
          latitude: points[0].lat,
          latitudeDelta: REGION_DELTA,
          longitude: points[0].lng,
          longitudeDelta: REGION_DELTA
        }}
      >
        {drawnRouteCount > 1 ? (
          <Polyline
            coordinates={points.slice(0, drawnRouteCount).map((point) => ({
              latitude: point.lat,
              longitude: point.lng
            }))}
            strokeColor="#475569"
            strokeWidth={4}
          />
        ) : null}
        {userCoord ? (
          <Marker
            coordinate={{
              latitude: userCoord.lat,
              longitude: userCoord.lng
            }}
          >
            <View style={styles.userMarker} />
          </Marker>
        ) : null}
        {ghostMarker ? (
          <Marker
            key={`ghost-${ghostMarkerTick}`}
            coordinate={{
              latitude: ghostMarker.lat,
              longitude: ghostMarker.lng
            }}
          >
            <View style={styles.ghostMarker} />
          </Marker>
        ) : null}
      </MapView>
      {isDemoRace ? (
        <View style={styles.demoBadge}>
          <Text style={styles.demoBadgeText}>Demo GPS stream</Text>
        </View>
      ) : null}
      {userCoord && userCoord.accuracy > GPS_CONFIG.weakAccuracyMeters ? (
        <View style={styles.gpsBadge}>
          <Text style={styles.gpsBadgeText}>GPS weak</Text>
        </View>
      ) : null}
      {isBioGuardPaused ? (
        <View style={styles.bioGuardBadge}>
          <Text style={styles.bioGuardText}>Bio-Guard active</Text>
        </View>
      ) : null}
      <View style={styles.hud}>
        <HudItem label="Gap" value={formatGap(hud.gapMeters)} strong />
        <HudItem label="Time Gap" value={`${hud.timeGapSeconds}s`} />
        <HudItem label="Pace" value={formatPace(hud.pace)} />
        <HudItem label="BPM" value={`${bpm}`} />
        <HudItem label="Zone" value={hud.heartRateZone} />
        <HudItem label="Finish" value={formatSessionDuration(hud.projectedFinishMs)} />
        <HudItem label="Elev" value={`${hud.elevationAhead >= 0 ? "+" : ""}${hud.elevationAhead} m`} />
        <HudItem label="Events" value={String(coachingEvents.length)} />
      </View>
      {latestCoaching ? (
        <CoachingCard
          bottomOffset={insets.bottom + COACHING_CARD_BOTTOM_SPACING}
          instruction={latestCoaching.instruction}
          onDismiss={handleCoachingDismiss}
          severity={latestCoaching.severity}
        />
      ) : null}
      {countdown > 0 ? (
        <View style={styles.countdownOverlay}>
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      ) : null}
      <Modal animationType="slide" transparent visible={raceResult !== null}>
        <View style={styles.modalBackdrop}>
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Race Complete</Text>
            <ResultRow label="Your time" value={formatSessionDuration(raceResult?.userTimeMs ?? 0)} />
            <ResultRow label="Ghost time" value={formatSessionDuration(raceResult?.ghostTimeMs ?? session.duration)} />
            <ResultRow label="Final gap" value={formatGap(raceResult?.finalGapMeters ?? null)} />
            <ResultRow label="Average pace" value={formatPace(raceResult?.averagePace ?? null)} />
            <ResultRow label="Coaching events" value={String(raceResult?.coachingEventCount ?? 0)} />
            <Pressable style={styles.primaryButton} onPress={handleRaceAgain}>
              <Text style={styles.primaryButtonText}>Race Again</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handleBackHome}>
              <Text style={styles.secondaryButtonText}>Back to Home</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function toCoord(point: {
  accuracy?: number;
  elevation?: number | null;
  lat: number;
  lng: number;
  speed?: number | null;
}): Coord {
  return {
    accuracy: point.accuracy ?? 0,
    elevation: point.elevation ?? null,
    heading: null,
    lat: point.lat,
    lng: point.lng,
    speed: point.speed ?? null
  };
}

function HudItem({
  label,
  strong,
  value
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <View style={styles.hudItem}>
      <Text style={styles.hudLabel}>{label}</Text>
      <Text style={[styles.hudValue, strong ? styles.hudStrong : null]}>{value}</Text>
    </View>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bioGuardBadge: {
    backgroundColor: "#B91C1C",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
    right: 12,
    top: 72,
    zIndex: 1
  },
  bioGuardText: {
    ...TYPOGRAPHY.caption,
    color: "#FFFFFF",
    fontWeight: "800"
  },
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  countdownOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  countdownText: {
    ...TYPOGRAPHY.title,
    color: "#111827",
    fontWeight: "800"
  },
  demoBadge: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
    top: 72,
    zIndex: 1
  },
  demoBadgeText: {
    ...TYPOGRAPHY.caption,
    color: "#FFFFFF",
    fontWeight: "800"
  },
  ghostMarker: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderColor: "#FFFFFF",
    borderRadius: 11,
    borderWidth: 2,
    height: 22,
    width: 22
  },
  gpsBadge: {
    backgroundColor: "#FFC107",
    borderRadius: 8,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
    top: 108,
    zIndex: 1
  },
  gpsBadgeText: {
    ...TYPOGRAPHY.caption,
    color: "#111827",
    fontWeight: "700"
  },
  hud: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    left: 12,
    padding: 10,
    position: "absolute",
    right: 12,
    top: 12,
    zIndex: 1
  },
  hudItem: {
    minWidth: "22%"
  },
  hudLabel: {
    ...TYPOGRAPHY.caption,
    color: "#64748B"
  },
  hudStrong: {
    color: "#0F766E"
  },
  hudValue: {
    ...TYPOGRAPHY.caption,
    color: "#111827",
    fontWeight: "800",
    marginTop: 2
  },
  map: {
    flex: 1
  },
  modalBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.24)",
    flex: 1,
    justifyContent: "flex-end"
  },
  permissionTitle: {
    ...TYPOGRAPHY.body,
    color: "#111827",
    marginBottom: 12
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#007AFF",
    borderRadius: 8,
    marginTop: 18,
    paddingVertical: 12
  },
  primaryButtonText: {
    ...TYPOGRAPHY.body,
    color: "#FFFFFF",
    fontWeight: "800"
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    padding: 20
  },
  resultLabel: {
    ...TYPOGRAPHY.caption,
    color: "#64748B"
  },
  resultRow: {
    borderBottomColor: "#E2E8F0",
    borderBottomWidth: 1,
    paddingVertical: 10
  },
  resultTitle: {
    ...TYPOGRAPHY.title,
    color: "#111827",
    fontWeight: "800",
    marginBottom: 8
  },
  resultValue: {
    ...TYPOGRAPHY.body,
    color: "#111827",
    fontWeight: "800",
    marginTop: 4
  },
  screen: {
    flex: 1
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#D1D5DB",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    paddingVertical: 12
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.body,
    color: "#111827",
    fontWeight: "800"
  },
  settingsLink: {
    ...TYPOGRAPHY.body,
    color: "#007AFF",
    fontWeight: "700"
  },
  userMarker: {
    backgroundColor: "#007AFF",
    borderColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    width: 20
  }
});
