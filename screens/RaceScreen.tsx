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
import { useMockHeartRate } from "../hooks/useMockHeartRate";
import { RootStackParamList } from "../navigation/types";
import {
  BIO_GUARD_CONFIG,
  COACHING_CONFIG,
  GPS_CONFIG,
  ROUTE_DRAW_CONFIG
} from "../constants/config";
import {
  CoachingInstruction,
  getCoachingInstruction
} from "../services/coaching";
import {
  Coord,
  requestLocationPermission,
  startWatchingLocation
} from "../services/location";
import { getDistanceMeters } from "../utils/geo";
import { ghostPosition, GhostPosition } from "../utils/ghostEngine";
import { TYPOGRAPHY } from "../theme";

const COUNTDOWN_START = 3;
const REGION_DELTA = 0.01;
const RENDER_INTERVAL_MS = 16;
const HUD_INTERVAL_MS = 1000;
const COACHING_CARD_BOTTOM_SPACING = 12;

type RaceRoute = RouteProp<RootStackParamList, "RaceScreen">;
type HudState = {
  elapsedMs: number;
  gapMeters: number | null;
  pace: number | null;
  totalDistance: number;
};
type RaceResult = {
  userTimeMs: number;
  ghostTimeMs: number;
  finalGapMeters: number | null;
  averagePace: number | null;
};

function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function formatPace(pace: number | null): string {
  if (pace === null) {
    return "--";
  }

  return `${pace.toFixed(1)} min/km`;
}

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

export default function RaceScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RaceRoute>();
  const { session } = params;
  const animationFrameRef = useRef<number | null>(null);
  const bioGuardCoachingRequestedRef = useRef(false);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentPaceRef = useRef<number | null>(null);
  const ghostRef = useRef<GhostPosition | null>(null);
  const ghostElapsedRef = useRef(0);
  const hudIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const raceEndedRef = useRef(false);
  const ghostPausedRef = useRef(false);
  const lastCoachingCallRef = useRef(0);
  const lastGhostFrameAtRef = useRef<number | null>(null);
  const lastUserPointRef = useRef<(Coord & { timestamp: number }) | null>(null);
  const mapRef = useRef<MapView>(null);
  const raceActiveRef = useRef(false);
  const raceStartRef = useRef<number | null>(null);
  const renderTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const routeDrawIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simulatedHRRef = useRef(155);
  const totalDistanceRef = useRef(0);
  const userCoordRef = useRef<Coord | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [ghostMarkerTick, setGhostMarkerTick] = useState(0);
  const [drawnRouteCount, setDrawnRouteCount] = useState(0);
  const [hud, setHud] = useState<HudState>({
    elapsedMs: 0,
    gapMeters: null,
    pace: null,
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

  console.log("[GhostStrategist] RaceScreen rendering", {
    countdown,
    bpm,
    gapMeters: hud.gapMeters,
    hasGhost: ghostRef.current !== null,
    hasUserCoord: userCoord !== null,
    isSessionLoading,
    isBioGuardPaused,
    isRacing,
    latestCoaching,
    pointCount: points.length,
    raceEnded: raceEndedRef.current,
    sessionId: session.id
  });

  useEffect(() => {
    const loadingTick = setTimeout(() => {
      console.log("[GhostStrategist] RaceScreen session loaded", {
        pointCount: points.length,
        sessionId: session.id
      });
      setIsSessionLoading(false);
    }, 0);

    return () => {
      clearTimeout(loadingTick);
    };
  }, [points.length, session.id]);

  useEffect(() => {
    simulatedHRRef.current = bpm;
  }, [bpm]);

  const handleCoachingDismiss = useCallback(() => {
    console.log("[GhostStrategist] RaceScreen coaching dismissed");
    setLatestCoaching(null);
  }, []);

  async function maybeRequestCoaching(gapMeters: number | null, force = false) {
    const now = Date.now();

    if (
      !force &&
      now - lastCoachingCallRef.current < COACHING_CONFIG.minIntervalMs
    ) {
      return;
    }

    lastCoachingCallRef.current = now;

    const snapshot = {
      distanceRemaining: Math.max(session.distance - totalDistanceRef.current, 0),
      gapMeters: gapMeters ?? 0,
      pace: currentPaceRef.current ?? 0,
      simulatedHR: simulatedHRRef.current,
      upcomingElevationDelta: COACHING_CONFIG.upcomingElevationDelta
    };

    console.log("[GhostStrategist] RaceScreen coaching snapshot built", snapshot);

    try {
      const instruction = await getCoachingInstruction(snapshot);

      console.log("[GhostStrategist] RaceScreen coaching response stored", {
        instruction
      });
      setLatestCoaching(instruction);
    } catch (error) {
      console.log("[GhostStrategist] RaceScreen coaching request failed", {
        error
      });
    }
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

    console.log("[GhostStrategist] RaceScreen ghost animation started", {
      ghostElapsedMs: ghostElapsedRef.current
    });
    animationFrameRef.current = requestAnimationFrame(animate);
  }

  function pauseGhostForBioGuard() {
    if (ghostPausedRef.current || raceEndedRef.current) {
      return;
    }

    ghostPausedRef.current = true;
    stopGhostAnimation();
    setIsBioGuardPaused(true);
    bioGuardCoachingRequestedRef.current = true;
    console.log("[GhostStrategist] RaceScreen bio-guard paused ghost", {
      bpm: simulatedHRRef.current,
      ghostElapsedMs: ghostElapsedRef.current
    });
    void maybeRequestCoaching(hud.gapMeters, true);
  }

  function resumeGhostAfterBioGuard() {
    if (!ghostPausedRef.current || raceEndedRef.current) {
      return;
    }

    ghostPausedRef.current = false;
    setIsBioGuardPaused(false);
    bioGuardCoachingRequestedRef.current = false;
    console.log("[GhostStrategist] RaceScreen bio-guard resumed ghost", {
      bpm: simulatedHRRef.current,
      ghostElapsedMs: ghostElapsedRef.current
    });
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

    console.log("[GhostStrategist] RaceScreen route draw started", {
      intervalMs,
      pointCount: points.length
    });

    routeDrawIntervalRef.current = setInterval(() => {
      setDrawnRouteCount((current) => {
        const nextCount = Math.min(points.length, current + 1);

        if (nextCount >= points.length && routeDrawIntervalRef.current !== null) {
          clearInterval(routeDrawIntervalRef.current);
          routeDrawIntervalRef.current = null;
          console.log("[GhostStrategist] RaceScreen route draw finished");
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

    raceEndedRef.current = true;
    stopRaceLoops();
    setIsRacing(false);
    setHud({
      elapsedMs: finalElapsedMs,
      gapMeters,
      pace: currentPaceRef.current,
      totalDistance: totalDistanceRef.current
    });
    setRaceResult({
      averagePace,
      finalGapMeters: gapMeters,
      ghostTimeMs: session.duration,
      userTimeMs: finalElapsedMs
    });

    console.log("[GhostStrategist] RaceScreen race ended", {
      averagePace,
      finalGapMeters: gapMeters,
      ghostTimeMs: session.duration,
      totalDistance: totalDistanceRef.current,
      userTimeMs: finalElapsedMs
    });
  }

  function handleRaceAgain() {
    console.log("[GhostStrategist] RaceScreen race again pressed", {
      sessionId: session.id
    });

    stopRaceLoops();
    raceEndedRef.current = false;
    raceStartRef.current = null;
    currentPaceRef.current = null;
    ghostElapsedRef.current = 0;
    ghostPausedRef.current = false;
    bioGuardCoachingRequestedRef.current = false;
    totalDistanceRef.current = 0;
    lastCoachingCallRef.current = 0;
    lastUserPointRef.current = null;
    ghostRef.current = {
      lat: points[0].lat,
      lng: points[0].lng
    };
    setCountdown(COUNTDOWN_START);
    setGhostMarkerTick(0);
    setDrawnRouteCount(0);
    setIsBioGuardPaused(false);
    setHud({
      elapsedMs: 0,
      gapMeters: null,
      pace: null,
      totalDistance: 0
    });
    setIsRacing(false);
    setLatestCoaching(null);
    setRaceResult(null);
    setRaceVersion((current) => current + 1);
  }

  function handleBackHome() {
    console.log("[GhostStrategist] RaceScreen back home pressed");
    stopRaceLoops();
    navigation.navigate("HomeScreen");
  }

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let mounted = true;

    console.log("[GhostStrategist] RaceScreen requesting location permission");

    void requestLocationPermission().then((granted) => {
      console.log("[GhostStrategist] RaceScreen location permission result", {
        granted
      });

      if (!mounted) {
        return;
      }

      if (!granted) {
        setPermissionDenied(true);
        return;
      }

      cleanup = startWatchingLocation((nextCoord) => {
        console.log("[GhostStrategist] RaceScreen user location update", nextCoord);
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
            console.log("[GhostStrategist] RaceScreen accepted pace sample", {
              currentPace: currentPaceRef.current,
              distanceDelta,
              totalDistance: totalDistanceRef.current
            });
          } else {
            console.log("[GhostStrategist] RaceScreen skipped pace sample", {
              distanceDelta,
              previousPace: currentPaceRef.current,
              timeDeltaMs
            });
          }
        }

        lastUserPointRef.current = {
          ...nextCoord,
          timestamp
        };
      });
    });

    return () => {
      console.log("[GhostStrategist] RaceScreen location cleanup");
      mounted = false;
      cleanup?.();
    };
  }, []);

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
      console.log("[GhostStrategist] RaceScreen has no points to race");
      return undefined;
    }

    ghostRef.current = {
      lat: points[0].lat,
      lng: points[0].lng
    };

    console.log("[GhostStrategist] RaceScreen countdown started", {
      sessionId: session.id
    });

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((current) => {
        const nextCountdown = current - 1;

        console.log("[GhostStrategist] RaceScreen countdown tick", {
          nextCountdown
        });

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
  }, [isSessionLoading, points, raceVersion, session.id]);

  useEffect(() => {
    if (isSessionLoading || countdown !== 0 || points.length === 0 || isRacing) {
      return undefined;
    }

    console.log("[GhostStrategist] RaceScreen race started", {
      pointCount: points.length,
      sessionId: session.id
    });

    setIsRacing(true);
    raceStartRef.current = Date.now();
    raceActiveRef.current = true;
    raceEndedRef.current = false;
    ghostElapsedRef.current = 0;
    ghostPausedRef.current = false;
    bioGuardCoachingRequestedRef.current = false;
    setIsBioGuardPaused(false);
    lastUserPointRef.current = userCoordRef.current
      ? {
          ...userCoordRef.current,
          timestamp: raceStartRef.current
        }
      : null;
    currentPaceRef.current = null;
    totalDistanceRef.current = 0;
    lastCoachingCallRef.current = 0;

    startGhostAnimation();
    startRouteDraw();
    renderTickRef.current = setInterval(() => {
      setGhostMarkerTick((current) => current + 1);
    }, RENDER_INTERVAL_MS);
    hudIntervalRef.current = setInterval(() => {
      const raceStart = raceStartRef.current;
      const userPosition = userCoordRef.current;
      const ghostPositionRef = ghostRef.current;

      if (raceStart === null) {
        return;
      }

      const elapsedMs = Date.now() - raceStart;
      const gapMeters = getSignedGapMeters(points[0], userPosition, ghostPositionRef);

      console.log("[GhostStrategist] RaceScreen HUD update", {
        elapsedMs,
        gapMeters,
        pace: currentPaceRef.current,
        pausedByBioGuard: ghostPausedRef.current,
        totalDistance: totalDistanceRef.current
      });

      if (elapsedMs >= session.duration) {
        finishRace(elapsedMs, gapMeters);
        return;
      }

      void maybeRequestCoaching(gapMeters);

      setHud({
        elapsedMs,
        gapMeters,
        pace: currentPaceRef.current,
        totalDistance: totalDistanceRef.current
      });
    }, HUD_INTERVAL_MS);

    return () => {
      console.log("[GhostStrategist] RaceScreen race cleanup");
      stopRaceLoops();
    };
  }, [countdown, isRacing, isSessionLoading, points, session.duration, session.id]);

  if (isSessionLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (permissionDenied) {
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
            strokeColor="#6B7280"
            strokeWidth={3}
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
      {userCoord && userCoord.accuracy > GPS_CONFIG.weakAccuracyMeters ? (
        <View style={styles.gpsBadge}>
          <Text style={styles.gpsBadgeText}>GPS weak</Text>
        </View>
      ) : null}
      <View style={styles.hud}>
        <View>
          <Text style={styles.hudLabel}>Gap</Text>
          <Text
            style={[
              styles.hudValue,
              hud.gapMeters === null
                ? null
                : hud.gapMeters >= 0
                  ? styles.positiveGap
                  : styles.negativeGap
            ]}
          >
            {formatGap(hud.gapMeters)}
          </Text>
        </View>
        <View>
          <Text style={styles.hudLabel}>Pace</Text>
          <Text style={styles.hudValue}>{formatPace(hud.pace)}</Text>
        </View>
        <View>
          <Text style={styles.hudLabel}>BPM</Text>
          <Text style={styles.hudValue}>{bpm}</Text>
        </View>
        <View>
          <Text style={styles.hudLabel}>Distance</Text>
          <Text style={styles.hudValue}>{Math.round(hud.totalDistance)} m</Text>
        </View>
        <View>
          <Text style={styles.hudLabel}>Time</Text>
          <Text style={styles.hudValue}>{formatElapsed(hud.elapsedMs)}</Text>
        </View>
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
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Your time</Text>
              <Text style={styles.resultValue}>
                {formatElapsed(raceResult?.userTimeMs ?? 0)}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Ghost time</Text>
              <Text style={styles.resultValue}>
                {formatElapsed(raceResult?.ghostTimeMs ?? session.duration)}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Final gap</Text>
              <Text
                style={[
                  styles.resultValue,
                  raceResult?.finalGapMeters === null
                    ? null
                    : (raceResult?.finalGapMeters ?? 0) >= 0
                      ? styles.positiveGap
                      : styles.negativeGap
                ]}
              >
                {formatGap(raceResult?.finalGapMeters ?? null)}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Average pace</Text>
              <Text style={styles.resultValue}>
                {formatPace(raceResult?.averagePace ?? null)}
              </Text>
            </View>
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

const styles = StyleSheet.create({
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
  ghostMarker: {
    backgroundColor: "rgba(107, 114, 128, 0.58)",
    borderColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    width: 20
  },
  gpsBadge: {
    backgroundColor: "#FFC107",
    borderRadius: 8,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
    top: 76,
    zIndex: 1
  },
  gpsBadgeText: {
    ...TYPOGRAPHY.caption,
    color: "#111827",
    fontWeight: "700"
  },
  hud: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderColor: "#E5E7EB",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    left: 12,
    padding: 12,
    position: "absolute",
    right: 12,
    top: 12,
    zIndex: 1
  },
  hudLabel: {
    ...TYPOGRAPHY.caption,
    color: "#6B7280",
  },
  hudValue: {
    ...TYPOGRAPHY.caption,
    color: "#111827",
    fontWeight: "700",
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
  negativeGap: {
    color: "#DC2626"
  },
  positiveGap: {
    color: "#15803D"
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
    fontWeight: "700"
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    padding: 20
  },
  resultLabel: {
    ...TYPOGRAPHY.caption,
    color: "#6B7280",
  },
  resultRow: {
    borderBottomColor: "#E5E7EB",
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
    fontWeight: "700",
    marginTop: 4
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
    fontWeight: "700"
  },
  settingsLink: {
    ...TYPOGRAPHY.body,
    color: "#007AFF",
    fontWeight: "700"
  },
  screen: {
    flex: 1
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
