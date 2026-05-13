import {
  RouteProp,
  useNavigation,
  useRoute
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { RootStackParamList } from "../navigation/types";
import { TYPOGRAPHY } from "../theme";
import {
  formatSessionDate,
  formatSessionDistance,
  formatSessionDuration
} from "../utils/sessionFormat";

type SessionDetailRoute = RouteProp<RootStackParamList, "SessionDetailScreen">;

export default function SessionDetailScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<SessionDetailRoute>();
  const { session } = params;

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
    <View style={styles.container}>
      <Text style={styles.title}>{formatSessionDate(session.startedAt)}</Text>
      <View style={styles.statRow}>
        <Text style={styles.label}>Distance</Text>
        <Text style={styles.value}>{formatSessionDistance(session.distance)}</Text>
      </View>
      <View style={styles.statRow}>
        <Text style={styles.label}>Duration</Text>
        <Text style={styles.value}>{formatSessionDuration(session.duration)}</Text>
      </View>
      <Pressable style={styles.button} onPress={handleRacePress}>
        <Text style={styles.buttonText}>Race</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "#007AFF",
    borderRadius: 8,
    marginTop: 24,
    paddingVertical: 12
  },
  buttonText: {
    ...TYPOGRAPHY.body,
    color: "#FFFFFF",
    fontWeight: "700"
  },
  container: {
    flex: 1,
    padding: 24
  },
  label: {
    ...TYPOGRAPHY.caption,
    color: "#6B7280",
  },
  statRow: {
    borderBottomColor: "#E5E7EB",
    borderBottomWidth: 1,
    paddingVertical: 16
  },
  title: {
    ...TYPOGRAPHY.title,
    color: "#111827",
    marginBottom: 16
  },
  value: {
    ...TYPOGRAPHY.body,
    color: "#111827",
    fontWeight: "700",
    marginTop: 4
  }
});
