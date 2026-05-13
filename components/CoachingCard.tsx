import { useEffect } from "react";
import * as Speech from "expo-speech";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";

import { CoachingInstruction } from "../services/coaching";
import { TYPOGRAPHY } from "../theme";

type CoachingCardProps = CoachingInstruction & {
  bottomOffset: number;
  onDismiss: () => void;
};

const AUTO_DISMISS_MS = 8000;
const ENTRY_OFFSET = 120;

const BACKGROUND_COLORS: Record<CoachingInstruction["severity"], string> = {
  caution: "#FFC107",
  info: "#FFFFFF",
  warning: "#F44336"
};

export default function CoachingCard({
  bottomOffset,
  instruction,
  onDismiss,
  severity
}: CoachingCardProps) {
  const translateY = useSharedValue(ENTRY_OFFSET);

  useEffect(() => {
    console.log("[GhostStrategist] CoachingCard mounted", {
      severity
    });

    console.log("[GhostStrategist] CoachingCard speech started", {
      instruction
    });
    Speech.speak(instruction);
    translateY.value = withTiming(0, {
      duration: 260
    });

    const timeout = setTimeout(() => {
      console.log("[GhostStrategist] CoachingCard auto dismissed");
      onDismiss();
    }, AUTO_DISMISS_MS);

    return () => {
      console.log("[GhostStrategist] CoachingCard cleanup");
      Speech.stop();
      clearTimeout(timeout);
    };
  }, [instruction, onDismiss, severity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: translateY.value
      }
    ]
  }));

  function handlePress() {
    console.log("[GhostStrategist] CoachingCard tapped");
    Speech.stop();
    onDismiss();
  }

  const isDarkBackground = severity === "warning";

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          backgroundColor: BACKGROUND_COLORS[severity],
          bottom: bottomOffset
        },
        animatedStyle
      ]}
    >
      <Pressable onPress={handlePress}>
        <Text style={[styles.severity, isDarkBackground ? styles.lightText : null]}>
          {severity}
        </Text>
        <Text style={[styles.instruction, isDarkBackground ? styles.lightText : null]}>
          {instruction}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  instruction: {
    ...TYPOGRAPHY.body,
    color: "#111827",
    fontWeight: "700",
    marginTop: 4
  },
  lightText: {
    color: "#FFFFFF"
  },
  severity: {
    ...TYPOGRAPHY.caption,
    color: "#374151",
    fontWeight: "700",
    textTransform: "uppercase"
  },
  wrapper: {
    borderColor: "#E5E7EB",
    borderRadius: 8,
    borderWidth: 1,
    left: 12,
    padding: 12,
    position: "absolute",
    right: 12,
    zIndex: 2
  }
});
