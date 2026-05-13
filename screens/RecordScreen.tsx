import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT
} from "react-native-maps";

import { RootStackParamList } from "../navigation/types";
import { saveSession } from "../services/sessions";
import { GPS_CONFIG } from "../constants/config";
import {
  Coord,
  requestLocationPermission,
  startWatchingLocation
} from "../services/location";
import { TYPOGRAPHY } from "../theme";

const REGION_DELTA = 0.01;
const EARTH_RADIUS_METERS = 6371000;

type RecordedPoint = {
  lat: number;
  lng: number;
  timestamp: number;
  pace: number | null;
};

type LatLng = {
  lat: number;
  lng: number;
};
type PendingSave = {
  distance: number;
  duration: number;
  points: RecordedPoint[];
  startedAt: number;
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

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function getDistanceMeters(from: LatLng, to: LatLng): number {
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(fromLat) *
      Math.cos(toLat) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

export default function RecordScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const mapRef = useRef<MapView>(null);
  const pointsRef = useRef<RecordedPoint[]>([]);
  const recordingRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const pendingSaveRef = useRef<PendingSave | null>(null);
  const [coord, setCoord] = useState<Coord | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [recordedPoints, setRecordedPoints] = useState<RecordedPoint[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [savedPoints, setSavedPoints] = useState<RecordedPoint[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);

  console.log("[GhostStrategist] RecordScreen rendering", {
    hasCoord: coord !== null,
    isRecording,
    isSaving,
    permissionDenied
  });

  async function persistRun(payload: PendingSave) {
    setIsSaving(true);
    setSaveError(false);

    try {
      const sessionId = await saveSession(payload);

      console.log("[GhostStrategist] RecordScreen save succeeded", {
        sessionId
      });
      pendingSaveRef.current = null;
      Alert.alert("Run saved!");
      navigation.navigate("HomeScreen");
    } catch (error) {
      console.log("[GhostStrategist] RecordScreen save failed", {
        error
      });
      setSaveError(true);
      Alert.alert("Save failed", "Could not save this run. Check Firebase and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    if (!isRecording) {
      return undefined;
    }

    const tick = setInterval(() => {
      if (startTimeRef.current === null) {
        return;
      }

      setElapsedMs(Date.now() - startTimeRef.current);
    }, 1000);

    return () => {
      clearInterval(tick);
    };
  }, [isRecording]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let mounted = true;

    console.log("[GhostStrategist] RecordScreen requesting location permission");

    void requestLocationPermission().then((granted) => {
      console.log("[GhostStrategist] RecordScreen location permission result", {
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
        console.log("[GhostStrategist] RecordScreen location update", nextCoord);
        setCoord(nextCoord);
        mapRef.current?.animateToRegion({
          latitude: nextCoord.lat,
          latitudeDelta: REGION_DELTA,
          longitude: nextCoord.lng,
          longitudeDelta: REGION_DELTA
        });

        if (!recordingRef.current) {
          return;
        }

        const timestamp = Date.now();
        const previousPoint = pointsRef.current[pointsRef.current.length - 1];
        let nextDistance = distanceRef.current;
        let nextPace = previousPoint?.pace ?? null;

        if (previousPoint) {
          const distanceDelta = getDistanceMeters(previousPoint, nextCoord);
          const timeDeltaMs = timestamp - previousPoint.timestamp;

          if (timeDeltaMs >= 1000 && distanceDelta >= 1) {
            nextDistance += distanceDelta;
            nextPace = timeDeltaMs / 60000 / (distanceDelta / 1000);
            console.log("[GhostStrategist] RecordScreen accepted pace sample", {
              distanceDelta,
              nextDistance,
              nextPace,
              timeDeltaMs
            });
          } else {
            console.log("[GhostStrategist] RecordScreen skipped pace sample", {
              distanceDelta,
              previousPace: nextPace,
              timeDeltaMs
            });
          }
        }

        const nextPoint: RecordedPoint = {
          lat: nextCoord.lat,
          lng: nextCoord.lng,
          pace: nextPace,
          timestamp
        };

        pointsRef.current = [...pointsRef.current, nextPoint];
        distanceRef.current = nextDistance;
        setRecordedPoints(pointsRef.current);
        setTotalDistance(nextDistance);
        console.log("[GhostStrategist] RecordScreen stored point", {
          pointCount: pointsRef.current.length,
          totalDistance: nextDistance
        });
      });
    });

    return () => {
      console.log("[GhostStrategist] RecordScreen cleanup");
      mounted = false;
      cleanup?.();
    };
  }, []);

  function handleStart() {
    console.log("[GhostStrategist] RecordScreen start pressed", {
      hasCoord: coord !== null
    });

    const startedAt = Date.now();
    const initialPoints: RecordedPoint[] = coord
      ? [
          {
            lat: coord.lat,
            lng: coord.lng,
            pace: null,
            timestamp: startedAt
          }
        ]
      : [];

    pointsRef.current = initialPoints;
    recordingRef.current = true;
    startTimeRef.current = startedAt;
    distanceRef.current = 0;
    setElapsedMs(0);
    setIsRecording(true);
    setRecordedPoints(initialPoints);
    setSaveError(false);
    setSavedPoints([]);
    setTotalDistance(0);
    console.log("[GhostStrategist] RecordScreen recording started", {
      initialPointCount: initialPoints.length
    });
  }

  async function handleStop() {
    const finalPoints = pointsRef.current;
    const startedAt = startTimeRef.current;
    const stoppedAt = Date.now();
    const duration = startedAt === null ? elapsedMs : stoppedAt - startedAt;
    const distance = distanceRef.current;

    console.log("[GhostStrategist] RecordScreen stop pressed", {
      finalPointCount: finalPoints.length,
      duration,
      totalDistance: distance
    });

    recordingRef.current = false;
    setIsRecording(false);
    setSavedPoints(finalPoints);

    if (startedAt === null) {
      console.log("[GhostStrategist] RecordScreen save skipped", {
        reason: "missing startedAt"
      });
      return;
    }

    const payload = {
      distance,
      duration,
      points: finalPoints,
      startedAt
    };

    pendingSaveRef.current = payload;
    await persistRun(payload);
  }

  function handleRetrySave() {
    if (pendingSaveRef.current === null) {
      return;
    }

    console.log("[GhostStrategist] RecordScreen retry save pressed");
    void persistRun(pendingSaveRef.current);
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

  return (
    <View style={styles.screen}>
      <MapView ref={mapRef} provider={PROVIDER_DEFAULT} style={styles.map}>
        {recordedPoints.length > 1 ? (
          <Polyline
            coordinates={recordedPoints.map((point) => ({
              latitude: point.lat,
              longitude: point.lng
            }))}
            strokeColor="#007AFF"
            strokeWidth={4}
          />
        ) : null}
        {coord ? (
          <Marker
            coordinate={{
              latitude: coord.lat,
              longitude: coord.lng
            }}
          />
        ) : null}
      </MapView>
      {coord && coord.accuracy > GPS_CONFIG.weakAccuracyMeters ? (
        <View style={styles.gpsBadge}>
          <Text style={styles.gpsBadgeText}>GPS weak</Text>
        </View>
      ) : null}
      <View style={styles.bottomBar}>
        <View style={styles.stats}>
          <View>
            <Text style={styles.label}>Time</Text>
            <Text style={styles.value}>{formatElapsed(elapsedMs)}</Text>
          </View>
          <View>
            <Text style={styles.label}>Distance</Text>
            <Text style={styles.value}>{Math.round(totalDistance)} m</Text>
          </View>
          <View>
            <Text style={styles.label}>Pace</Text>
            <Text style={styles.value}>
              {formatPace(recordedPoints[recordedPoints.length - 1]?.pace ?? null)}
            </Text>
          </View>
        </View>
        <Pressable
          disabled={isSaving}
          style={[
            styles.button,
            isRecording ? styles.stopButton : styles.startButton,
            isSaving ? styles.disabledButton : null
          ]}
          onPress={isRecording ? handleStop : handleStart}
        >
          {isSaving ? (
            <View style={styles.inlineSpinner}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.buttonText}>Saving...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>{isRecording ? "Stop" : "Start"}</Text>
          )}
        </Pressable>
        {saveError ? (
          <Pressable style={styles.retryButton} onPress={handleRetrySave}>
            <Text style={styles.retryButtonText}>Retry Save</Text>
          </Pressable>
        ) : null}
        <Text style={styles.savedText}>Saved points: {savedPoints.length}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  bottomBar: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#D1D5DB",
    borderTopWidth: 1,
    bottom: 0,
    gap: 10,
    left: 0,
    padding: 16,
    position: "absolute",
    right: 0
  },
  button: {
    alignItems: "center",
    borderRadius: 8,
    paddingVertical: 12
  },
  buttonText: {
    ...TYPOGRAPHY.body,
    color: "#FFFFFF",
    fontWeight: "700"
  },
  disabledButton: {
    opacity: 0.6
  },
  gpsBadge: {
    backgroundColor: "#FFC107",
    borderRadius: 8,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
    top: 12
  },
  gpsBadgeText: {
    ...TYPOGRAPHY.caption,
    color: "#111827",
    fontWeight: "700"
  },
  inlineSpinner: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  label: {
    ...TYPOGRAPHY.caption,
    color: "#6B7280",
  },
  map: {
    flex: 1
  },
  permissionTitle: {
    ...TYPOGRAPHY.body,
    color: "#111827",
    marginBottom: 12
  },
  retryButton: {
    alignItems: "center",
    borderColor: "#DC2626",
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10
  },
  retryButtonText: {
    ...TYPOGRAPHY.body,
    color: "#DC2626",
    fontWeight: "700"
  },
  savedText: {
    ...TYPOGRAPHY.caption,
    color: "#6B7280",
    textAlign: "center"
  },
  screen: {
    flex: 1
  },
  settingsLink: {
    ...TYPOGRAPHY.body,
    color: "#007AFF",
    fontWeight: "700"
  },
  startButton: {
    backgroundColor: "#007AFF"
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  stopButton: {
    backgroundColor: "#DC2626"
  },
  value: {
    ...TYPOGRAPHY.body,
    color: "#111827",
    fontWeight: "700"
  }
});
