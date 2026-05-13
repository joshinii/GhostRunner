import * as Location from "expo-location";

export type Coord = {
  lat: number;
  lng: number;
  accuracy: number;
};

export async function requestLocationPermission(): Promise<boolean> {
  console.log("[GhostStrategist] location permission request started");
  const { status } = await Location.requestForegroundPermissionsAsync();
  console.log("[GhostStrategist] location permission request finished", {
    status
  });

  return status === Location.PermissionStatus.GRANTED;
}

export function startWatchingLocation(callback: (coord: Coord) => void): () => void {
  console.log("[GhostStrategist] location watch starting", {
    accuracy: "High",
    distanceInterval: 0,
    timeInterval: 1000
  });

  let subscription: Location.LocationSubscription | null = null;
  let cancelled = false;

  void Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 0,
      timeInterval: 1000
    },
    (location) => {
      const coord = {
        accuracy: location.coords.accuracy ?? 0,
        lat: location.coords.latitude,
        lng: location.coords.longitude
      };

      console.log("[GhostStrategist] location watch received coordinate", coord);
      callback(coord);
    }
  ).then((nextSubscription) => {
    if (cancelled) {
      console.log("[GhostStrategist] location watch cancelled before subscription ready");
      nextSubscription.remove();
      return;
    }

    console.log("[GhostStrategist] location watch subscription ready");
    subscription = nextSubscription;
  });

  return () => {
    console.log("[GhostStrategist] location watch stopping");
    cancelled = true;
    subscription?.remove();
  };
}
