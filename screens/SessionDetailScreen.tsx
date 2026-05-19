import {
  RouteProp,
  useNavigation,
  useRoute
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { RootStackParamList } from "../navigation/types";
import type { CoachingEvent, SessionPoint } from "../services/sessions";
import { TYPOGRAPHY } from "../theme";
import { smoothGPSPoints } from "../utils/dataEngineering";
import { generateRaceNarrative } from "../utils/raceNarrative";
import {
  formatElevation,
  formatHeartRate,
  formatPace,
  formatSessionDate,
  formatSessionDistance,
  formatSessionDuration
} from "../utils/sessionFormat";

type SessionDetailRoute = RouteProp<RootStackParamList, "SessionDetailScreen">;

export default function SessionDetailScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<SessionDetailRoute>();
  const { session } = params;
  const paceValues = compact(session.points.map((point) => point.pace));
  const heartRateValues = compact(session.points.map((point) => point.heartRate));
  const elevationValues = compact(session.points.map((point) => point.elevation));
  const recentEvents = session.coachingEvents?.slice(-4).reverse() ?? [];
  const smoothedPoints = smoothGPSPoints(session.points);
  const pointsRemoved = session.points.length - smoothedPoints.length;
  const allEvents = session.coachingEvents ?? [];
  const raceResult = session.raceResults?.[session.raceResults.length - 1];
  const narrative =
    allEvents.length > 0 && raceResult
      ? generateRaceNarrative(allEvents, raceResult, session.duration)
      : [];

  console.log("[GhostStrategist] SessionDetailScreen rendering", {
    sessionId: session.id
  });

  function handleRacePress() {
    console.log("[GhostStrategist] SessionDetailScreen race pressed", {
      pointCount: session.points.length,
      sessionId: session.id
    });

    navigation.navigate("RaceScreen", {
      session
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>{session.mode.toUpperCase()} GHOST</Text>
        <Text style={styles.title}>{session.title}</Text>
        <Text style={styles.subtitle}>
          {formatSessionDate(session.startedAt)} | {session.source} | {session.syncStatus}
        </Text>
      </View>
      <View style={styles.statGrid}>
        <Stat label="Distance" value={formatSessionDistance(session.distance)} />
        <Stat label="Duration" value={formatSessionDuration(session.duration)} />
        <Stat label="Avg pace" value={formatPace(session.summary.averagePace)} />
        <Stat label="Avg HR" value={formatHeartRate(session.summary.averageHeartRate)} />
        <Stat label="Max HR" value={formatHeartRate(session.summary.maxHeartRate)} />
        <Stat label="Elevation" value={`+${formatElevation(session.summary.elevationGain)}`} />
        <Stat label="Quality" value={`${session.summary.dataQualityScore}%`} />
        <Stat label="Packets" value={String(session.summary.packetLossEvents)} />
      </View>
      <View style={styles.band}>
        <Text style={styles.sectionTitle}>Data Pipeline</Text>
        <Text style={styles.bodyText}>
          Raw points: {session.points.length} → After GPS smoothing: {smoothedPoints.length}
          {pointsRemoved > 0 ? ` (${pointsRemoved} low-accuracy points removed)` : " (all points retained)"}
        </Text>
        <Text style={styles.bodyText}>
          Quality score: {session.summary.dataQualityScore}% | Packet loss events: {session.summary.packetLossEvents}
        </Text>
      </View>
      <View style={styles.band}>
        <Text style={styles.sectionTitle}>Telemetry Analytics</Text>
        <MiniChart color="#007AFF" label="Pace" values={paceValues} />
        <MiniChart color="#DC2626" label="Heart rate" values={heartRateValues} />
        <MiniChart color="#0F766E" label="Elevation" values={elevationValues} />
      </View>
      <View style={styles.band}>
        <Text style={styles.sectionTitle}>Agent Evidence</Text>
        <Text style={styles.bodyText}>
          The race agent observes pace, gap, heart rate, projected finish, weather, and near-future elevation every coaching tick.
        </Text>
        {recentEvents.length > 0 ? (
          recentEvents.map((event) => <EventRow event={event} key={event.id} />)
        ) : (
          <Text style={styles.emptyText}>Race this session to create coaching event history.</Text>
        )}
      </View>
      <View style={styles.band}>
        <Text style={styles.sectionTitle}>Goal and Conditions</Text>
        <Text style={styles.bodyText}>
          Target pace {formatPace(session.goal?.targetPaceMinPerKm)} | target time{" "}
          {formatSessionDuration(session.goal?.targetTimeMs ?? session.duration)}
        </Text>
        <Text style={styles.bodyText}>
          Weather {session.weather?.condition ?? "unknown"} | wind {session.weather?.windMph ?? 0} mph | temp{" "}
          {session.weather?.temperatureF ?? "--"} F
        </Text>
      </View>
      {narrative.length > 0 && (
        <View style={styles.band}>
          <Text style={styles.sectionTitle}>Race Narrative</Text>
          {narrative.map((line, index) => (
            <Text key={index} style={styles.narrativeLine}>{line}</Text>
          ))}
        </View>
      )}
      <Pressable style={styles.button} onPress={handleRacePress}>
        <Text style={styles.buttonText}>Race This Ghost</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function MiniChart({
  color,
  label,
  values
}: {
  color: string;
  label: string;
  values: number[];
}) {
  const sample = values.length > 48 ? values.filter((_, index) => index % Math.ceil(values.length / 48) === 0) : values;
  const min = sample.length > 0 ? Math.min(...sample) : 0;
  const max = sample.length > 0 ? Math.max(...sample) : 1;
  const span = Math.max(max - min, 1);

  return (
    <View style={styles.chartBlock}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartLabel}>{label}</Text>
        <Text style={styles.chartValue}>
          {sample.length > 0 ? `${Math.round(min)}-${Math.round(max)}` : "--"}
        </Text>
      </View>
      <View style={styles.chart}>
        {sample.map((value, index) => (
          <View
            key={`${label}-${index}`}
            style={[
              styles.bar,
              {
                backgroundColor: color,
                height: 12 + ((value - min) / span) * 54
              }
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function EventRow({ event }: { event: CoachingEvent }) {
  return (
    <View style={styles.eventRow}>
      <Text style={styles.eventMeta}>
        {formatSessionDuration(event.elapsedMs)} | {event.severity} | {event.toolUsed}
      </Text>
      <Text style={styles.eventInstruction}>{event.instruction}</Text>
      <Text style={styles.eventReason}>{event.reason}</Text>
    </View>
  );
}

function compact(values: Array<number | null | undefined>): number[] {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

const styles = StyleSheet.create({
  band: {
    borderTopColor: "#E2E8F0",
    borderTopWidth: 1,
    gap: 12,
    paddingTop: 18
  },
  bar: {
    borderRadius: 3,
    flex: 1,
    minWidth: 3
  },
  bodyText: {
    ...TYPOGRAPHY.body,
    color: "#334155",
    lineHeight: 22
  },
  button: {
    alignItems: "center",
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 13
  },
  buttonText: {
    ...TYPOGRAPHY.body,
    color: "#FFFFFF",
    fontWeight: "800"
  },
  chart: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 3,
    height: 72
  },
  chartBlock: {
    gap: 8
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  chartLabel: {
    ...TYPOGRAPHY.caption,
    color: "#64748B",
    fontWeight: "700"
  },
  chartValue: {
    ...TYPOGRAPHY.caption,
    color: "#111827",
    fontWeight: "700"
  },
  container: {
    gap: 20,
    padding: 20
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: "#64748B"
  },
  eventInstruction: {
    ...TYPOGRAPHY.body,
    color: "#111827",
    fontWeight: "800",
    marginTop: 3
  },
  eventMeta: {
    ...TYPOGRAPHY.caption,
    color: "#64748B",
    fontWeight: "700"
  },
  eventReason: {
    ...TYPOGRAPHY.caption,
    color: "#475569",
    marginTop: 4
  },
  eventRow: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 12
  },
  header: {
    gap: 4
  },
  kicker: {
    ...TYPOGRAPHY.caption,
    color: "#0F766E",
    fontWeight: "800"
  },
  label: {
    ...TYPOGRAPHY.caption,
    color: "#64748B"
  },
  sectionTitle: {
    ...TYPOGRAPHY.body,
    color: "#111827",
    fontWeight: "800"
  },
  stat: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    minWidth: "47%",
    padding: 12
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: "#64748B"
  },
  title: {
    ...TYPOGRAPHY.title,
    color: "#111827",
    fontWeight: "800"
  },
  narrativeLine: {
    ...TYPOGRAPHY.body,
    color: "#334155",
    lineHeight: 22
  },
  value: {
    ...TYPOGRAPHY.body,
    color: "#111827",
    fontWeight: "800",
    marginTop: 4
  }
});
