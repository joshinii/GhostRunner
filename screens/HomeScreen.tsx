import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { RootStackParamList } from "../navigation/types";
import { getSessions, Session } from "../services/sessions";
import { TYPOGRAPHY } from "../theme";
import {
  formatSessionDate,
  formatSessionDistance,
  formatSessionDuration
} from "../utils/sessionFormat";

export default function HomeScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);

  console.log("[GhostStrategist] HomeScreen rendering", {
    isLoading,
    sessionCount: sessions.length
  });

  useFocusEffect(
    useCallback(() => {
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
            setErrorMessage("Could not load runs. Check your network and try again.");
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
    }, [])
  );

  function handleSessionPress(session: Session) {
    console.log("[GhostStrategist] HomeScreen session row pressed", {
      sessionId: session.id
    });

    navigation.navigate("SessionDetailScreen", {
      session
    });
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Runs unavailable</Text>
        <Text style={styles.emptyText}>{errorMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={
        sessions.length === 0 ? styles.emptyContainer : styles.listContent
      }
      data={sessions}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No runs yet</Text>
          <Text style={styles.emptyText}>Record a run to see it here.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => handleSessionPress(item)}>
          <Text style={styles.rowTitle}>{formatSessionDate(item.startedAt)}</Text>
          <View style={styles.rowStats}>
            <Text style={styles.rowStat}>{formatSessionDistance(item.distance)}</Text>
            <Text style={styles.rowStat}>{formatSessionDuration(item.duration)}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  emptyContainer: {
    flexGrow: 1
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: "#6B7280",
    marginTop: 6
  },
  emptyTitle: {
    ...TYPOGRAPHY.title,
    color: "#111827",
  },
  listContent: {
    padding: 16
  },
  row: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16
  },
  rowStat: {
    ...TYPOGRAPHY.body,
    color: "#374151",
    fontWeight: "600"
  },
  rowStats: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8
  },
  rowTitle: {
    ...TYPOGRAPHY.title,
    color: "#111827",
  }
});
