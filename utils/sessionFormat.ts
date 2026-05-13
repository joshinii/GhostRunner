import { DATE_FORMAT_OPTIONS } from "../constants/config";

export function formatSessionDate(startedAt: number): string {
  return new Date(startedAt).toLocaleDateString(undefined, DATE_FORMAT_OPTIONS);
}

export function formatSessionDistance(distanceMeters: number): string {
  return `${(distanceMeters / 1000).toFixed(2)} km`;
}

export function formatSessionDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}
