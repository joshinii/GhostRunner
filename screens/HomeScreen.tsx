import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { DEMO_USER_PROFILE } from "../constants/config";
import { RootStackParamList } from "../navigation/types";
import { createDemoSessions } from "../services/demoSession";
import { getSessions, saveSession, Session } from "../services/sessions";
import { TYPOGRAPHY } from "../theme";
import { computeWeeklyTrends } from "../utils/dataEngineering";
import {
  formatHeartRate,
  formatPace,
  formatSessionDate,
  formatSessionDistance,
  formatSessionDuration
} from "../utils/sessionFormat";

export default function HomeScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const dashboard = useMemo(() => getDashboardMetrics(sessions), [sessions]);
  const weeklyTrends = useMemo(() => computeWeeklyTrends(sessions), [sessions]);
  const hasMultipleWeeks = weeklyTrends.length >= 2;

  console.log("[GhostStrategist] HomeScreen rendering", {
    isLoading,
    sessionCount: sessions.length
  });

  const loadSessions = useCallback(() => {
    let active = true;

    console.log("[GhostStrategist] HomeScreen loading sessions");
    setErrorMessage(null);
    setIsLoading(true);

    void getSessions()
      .then((nextSessions) => {
        if (!active) {
          return;
        }

        console.log("[GhostStrategist] HomeScreen sessions loaded", {
          count: nextSessions.length
        });
        setSessions(nextSessions);
      })
      .catch((error) => {
        console.log("[GhostStrategist] HomeScreen sessions load failed", {
          error
        });
        if (active) {
          setErrorMessage("Could not load sessions. Seed demo data or check Firebase.");
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      console.log("[GhostStrategist] HomeScreen load cleanup");
      active = false;
    };
  }, []);

  useFocusEffect(loadSessions);

  function handleSessionPress(session: Session) {
    console.log("[GhostStrategist] HomeScreen session row pressed", {
      sessionId: session.id
    });

    navigation.navigate("SessionDetailScreen", {
      session
    });
  }

  async function handleSeedDemoData() {
    setIsSeedingDemo(true);

    try {
      const demoSessions = createDemoSessions();

      for (const demoSession of demoSessions) {
        await saveSession(demoSession);
      }

      setSessions(await getSessions());
      Alert.alert("Demo data ready", "Run and ride ghost sessions were added.");
    } catch (error) {
      console.log("[GhostStrategist] HomeScreen demo seed failed", {
        error
      });
      Alert.alert("Demo seed failed", "Could not create demo sessions.");
    } finally {
      setIsSeedingDemo(false);
    }
  }

  function renderHeader() {
    return (
      <View style={styles.header}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Ghost Strategist</Text>
          <Text style={styles.heroTitle}>Real-time racing agent</Text>
          <Text style={styles.heroCopy}>
            {DEMO_USER_PROFILE.name} | max HR {DEMO_USER_PROFILE.estimatedMaxHeartRate} bpm | target{" "}
            {formatPace(DEMO_USER_PROFILE.targetPaceMinPerKm)}
          </Text>
        </View>
        <View style={styles.metricGrid}>
          <Metric label="Sessions" value={String(sessions.length)} />
          <Metric label="Distance" value={formatSessionDistance(dashboard.totalDistance)} />
          <Metric label="Best Pace" value={formatPace(dashboard.bestPace)} />
          <Metric label="Avg HR" value={formatHeartRate(dashboard.averageHeartRate)} />
        </View>
        <View style={styles.actions}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.navigate("RecordScreen")}
          >
            <Text style={styles.primaryButtonText}>Record Workout</Text>
          </Pressable>
          <Pressable
            disabled={isSeedingDemo}
            style={[styles.secondaryButton, isSeedingDemo ? styles.disabledButton : null]}
            onPress={handleSeedDemoData}
          >
            <Text style={styles.secondaryButtonText}>
              {isSeedingDemo ? "Preparing Demo..." : "Seed Demo Race"}
            </Text>
          </Pressable>
        </View>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {hasMultipleWeeks && (
          <View style={styles.trendsCard}>
            <Text style={styles.sectionTitle}>Weekly Trends</Text>
            {weeklyTrends.slice(-4).map((week) => (
              <View key={week.isoWeek} style={styles.trendRow}>
                <Text style={styles.trendWeek}>{week.isoWeek}</Text>
                <Text style={styles.trendStat}>{formatSessionDistance(week.totalDistanceMeters)}</Text>
                <Text style={styles.trendStat}>{week.sessionCount} session{week.sessionCount !== 1 ? "s" : ""}</Text>
                {week.avgPaceImprovement !== null && (
                  <Text style={[styles.trendStat, { color: week.avgPaceImprovement < 0 ? "#16A34A" : "#DC2626" }]}>
                    {week.avgPaceImprovement < 0 ? "▲" : "▼"} pace
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
        <Text style={styles.sectionTitle}>Race Library</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={sessions.length === 0 ? styles.emptyContainer : styles.listContent}
      data={sessions}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No sessions yet</Text>
          <Text style={styles.emptyText}>Record outside or seed a controlled demo race.</Text>
        </View>
      }
      ListHeaderComponent={renderHeader}
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => handleSessionPress(item)}>
          <View style={styles.rowHeader}>
            <View>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSubTitle}>
                {formatSessionDate(item.startedAt)} | {item.mode.toUpperCase()} | {item.source}
              </Text>
            </View>
            <View
              style={[
                styles.syncBadge,
                item.syncStatus === "pending" ? styles.pendingBadge : styles.syncedBadge
              ]}
            >
              <Text style={styles.syncBadgeText}>{item.syncStatus}</Text>
            </View>
          </View>
          <View style={styles.rowStats}>
            <Text style={styles.rowStat}>{formatSessionDistance(item.distance)}</Text>
            <Text style={styles.rowStat}>{formatSessionDuration(item.duration)}</Text>
            <Text style={styles.rowStat}>{formatPace(item.summary.averagePace)}</Text>
            <Text style={styles.rowStat}>{formatHeartRate(item.summary.averageHeartRate)}</Text>
          </View>
          <View style={styles.qualityRow}>
            <Text style={styles.qualityText}>
              Data quality {item.summary.dataQualityScore}% | Elevation +{item.summary.elevationGain} m
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function getDashboardMetrics(sessions: Session[]) {
  const totalDistance = sessions.reduce((sum, session) => sum + session.distance, 0);
  const paceValues = sessions
    .map((session) => session.summary.averagePace)
    .filter((pace): pace is number => typeof pace === "number" && pace > 0);
  const hrValues = sessions
    .map((session) => session.summary.averageHeartRate)
    .filter((heartRate): heartRate is number => typeof heartRate === "number");

  return {
    averageHeartRate:
      hrValues.length === 0
        ? null
        : hrValues.reduce((sum, value) => sum + value, 0) / hrValues.length,
    bestPace: paceValues.length === 0 ? null : Math.min(...paceValues),
    totalDistance
  };
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14
  },
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  disabledButton: {
    opacity: 0.58
  },
  emptyContainer: {
    flexGrow: 1
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: "#64748B",
    marginTop: 6,
    textAlign: "center"
  },
  emptyTitle: {
    ...TYPOGRAPHY.title,
    color: "#111827"
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: "#B91C1C",
    marginTop: 10
  },
  header: {
    gap: 14,
    paddingBottom: 6
  },
  hero: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    padding: 16
  },
  heroCopy: {
    ...TYPOGRAPHY.caption,
    color: "#CBD5E1",
    marginTop: 8
  },
  heroTitle: {
    ...TYPOGRAPHY.title,
    color: "#FFFFFF",
    fontWeight: "800",
    marginTop: 4
  },
  kicker: {
    ...TYPOGRAPHY.caption,
    color: "#7DD3FC",
    fontWeight: "700",
    textTransform: "uppercase"
  },
  listContent: {
    padding: 16
  },
  metric: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minWidth: "47%",
    padding: 12
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  metricLabel: {
    ...TYPOGRAPHY.caption,
    color: "#64748B"
  },
  metricValue: {
    ...TYPOGRAPHY.body,
    color: "#111827",
    fontWeight: "800",
    marginTop: 4
  },
  pendingBadge: {
    backgroundColor: "#FEF3C7"
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#007AFF",
    borderRadius: 8,
    flex: 1,
    paddingVertical: 12
  },
  primaryButtonText: {
    ...TYPOGRAPHY.body,
    color: "#FFFFFF",
    fontWeight: "800"
  },
  qualityRow: {
    marginTop: 12
  },
  qualityText: {
    ...TYPOGRAPHY.caption,
    color: "#64748B"
  },
  row: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 16
  },
  rowHeader: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  rowStat: {
    ...TYPOGRAPHY.caption,
    color: "#334155",
    fontWeight: "700"
  },
  rowStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12
  },
  rowSubTitle: {
    ...TYPOGRAPHY.caption,
    color: "#64748B",
    marginTop: 4
  },
  rowTitle: {
    ...TYPOGRAPHY.body,
    color: "#111827",
    fontWeight: "800"
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#0F172A",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.body,
    color: "#0F172A",
    fontWeight: "800"
  },
  sectionTitle: {
    ...TYPOGRAPHY.body,
    color: "#111827",
    fontWeight: "800",
    marginTop: 2
  },
  syncBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  syncBadgeText: {
    ...TYPOGRAPHY.caption,
    color: "#111827",
    fontWeight: "700"
  },
  syncedBadge: {
    backgroundColor: "#DCFCE7"
  },
  trendRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6
  },
  trendStat: {
    ...TYPOGRAPHY.caption,
    color: "#334155",
    fontWeight: "700"
  },
  trendWeek: {
    ...TYPOGRAPHY.caption,
    color: "#64748B",
    minWidth: 80
  },
  trendsCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 14
  }
});
