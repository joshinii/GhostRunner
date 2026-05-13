import { useEffect, useRef, useState } from "react";

import { MOCK_HEART_RATE } from "../constants/config";

type UseMockHeartRateInput = {
  gapMeters: number | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function useMockHeartRate({ gapMeters }: UseMockHeartRateInput): number {
  const baseBpmRef = useRef<number>(MOCK_HEART_RATE.startBpm);
  const elapsedSecondsRef = useRef<number>(0);
  const gapMetersRef = useRef<number | null>(gapMeters);
  const highHeartRateAtRef = useRef<number | null>(null);
  const [bpm, setBpm] = useState<number>(MOCK_HEART_RATE.startBpm);

  useEffect(() => {
    gapMetersRef.current = gapMeters;
  }, [gapMeters]);

  useEffect(() => {
    console.log("[GhostStrategist] mock heart rate started", {
      startBpm: MOCK_HEART_RATE.startBpm
    });

    const interval = setInterval(() => {
      elapsedSecondsRef.current += MOCK_HEART_RATE.updateIntervalMs / 1000;

      const currentGap = gapMetersRef.current;
      const now = Date.now();
      const shouldRecover =
        highHeartRateAtRef.current !== null &&
        now - highHeartRateAtRef.current >= MOCK_HEART_RATE.recoveryAfterHighMs;

      if (shouldRecover) {
        baseBpmRef.current = Math.max(
          MOCK_HEART_RATE.floor,
          baseBpmRef.current - MOCK_HEART_RATE.behindDriftPerSecond * 6
        );
      } else if (currentGap !== null && currentGap < 0) {
        baseBpmRef.current = Math.min(
          MOCK_HEART_RATE.upperCap,
          baseBpmRef.current + MOCK_HEART_RATE.behindDriftPerSecond
        );
      } else if (currentGap !== null && currentGap > 0) {
        baseBpmRef.current = Math.max(
          MOCK_HEART_RATE.floor,
          baseBpmRef.current - MOCK_HEART_RATE.positiveDriftPerSecond
        );
      }

      const wave =
        Math.sin(
          (elapsedSecondsRef.current / MOCK_HEART_RATE.wavePeriodSeconds) *
            Math.PI *
            2
        ) * MOCK_HEART_RATE.amplitude;
      const nextBpm = Math.round(
        clamp(
          baseBpmRef.current + wave,
          MOCK_HEART_RATE.floor,
          MOCK_HEART_RATE.upperCap
        )
      );

      if (nextBpm >= MOCK_HEART_RATE.upperCap && highHeartRateAtRef.current === null) {
        highHeartRateAtRef.current = now;
        console.log("[GhostStrategist] mock heart rate high threshold reached", {
          bpm: nextBpm
        });
      }

      if (shouldRecover && nextBpm < MOCK_HEART_RATE.recoveryTarget) {
        highHeartRateAtRef.current = null;
        baseBpmRef.current = Math.min(baseBpmRef.current, MOCK_HEART_RATE.recoveryTarget);
        console.log("[GhostStrategist] mock heart rate recovered", {
          bpm: nextBpm
        });
      }

      console.log("[GhostStrategist] mock heart rate update", {
        baseBpm: baseBpmRef.current,
        bpm: nextBpm,
        gapMeters: currentGap
      });

      setBpm(nextBpm);
    }, MOCK_HEART_RATE.updateIntervalMs);

    return () => {
      console.log("[GhostStrategist] mock heart rate stopped");
      clearInterval(interval);
    };
  }, []);

  return bpm;
}
