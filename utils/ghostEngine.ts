export type GhostPoint = {
  lat: number;
  lng: number;
  timestamp: number;
};

export type GhostPosition = {
  lat: number;
  lng: number;
};

export function ghostPosition(
  points: GhostPoint[],
  elapsedMs: number
): GhostPosition {
  if (points.length === 0) {
    throw new Error("ghostPosition requires at least one point");
  }

  if (points.length === 1 || elapsedMs <= 0) {
    return {
      lat: points[0].lat,
      lng: points[0].lng
    };
  }

  const targetTimestamp = points[0].timestamp + elapsedMs;
  const lastPoint = points[points.length - 1];

  if (targetTimestamp >= lastPoint.timestamp) {
    return {
      lat: lastPoint.lat,
      lng: lastPoint.lng
    };
  }

  let low = 0;
  let high = points.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    if (points[mid].timestamp < targetTimestamp) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const nextPoint = points[low];
  const previousPoint = points[low - 1];
  const segmentDuration = nextPoint.timestamp - previousPoint.timestamp;
  const progress =
    segmentDuration === 0
      ? 0
      : (targetTimestamp - previousPoint.timestamp) / segmentDuration;

  return {
    lat: previousPoint.lat + (nextPoint.lat - previousPoint.lat) * progress,
    lng: previousPoint.lng + (nextPoint.lng - previousPoint.lng) * progress
  };
}
