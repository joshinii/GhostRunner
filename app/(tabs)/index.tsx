import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

import {
  Coord,
  requestLocationPermission,
  startWatchingLocation
} from "../../services/location";

const REGION_DELTA = 0.01;
const INITIAL_COORD: Coord = {
  accuracy: 0,
  lat: 37.3349,
  lng: -122.009
};

export default function HomeScreen() {
  const mapRef = useRef<MapView>(null);
  const [coord, setCoord] = useState<Coord | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let mounted = true;

    void requestLocationPermission().then((granted) => {
      if (!mounted) {
        return;
      }

      if (!granted) {
        setPermissionDenied(true);
        return;
      }

      cleanup = startWatchingLocation((nextCoord) => {
        setCoord(nextCoord);
        mapRef.current?.animateToRegion({
          latitude: nextCoord.lat,
          latitudeDelta: REGION_DELTA,
          longitude: nextCoord.lng,
          longitudeDelta: REGION_DELTA
        });
        // TODO: Wire Firestore session persistence here later.
      });
    });

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, []);

  if (permissionDenied) {
    return (
      <View style={styles.centered}>
        <Text>Location permission required.</Text>
      </View>
    );
  }

  const markerCoord = coord ?? INITIAL_COORD;

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_DEFAULT}
      style={styles.map}
      initialRegion={{
        latitude: markerCoord.lat,
        latitudeDelta: REGION_DELTA,
        longitude: markerCoord.lng,
        longitudeDelta: REGION_DELTA
      }}
    >
      {coord ? (
        <Marker
          coordinate={{
            latitude: coord.lat,
            longitude: coord.lng
          }}
        >
          <View style={styles.marker} />
        </Marker>
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  map: {
    flex: 1
  },
  marker: {
    backgroundColor: "#007AFF",
    borderColor: "#FFFFFF",
    borderRadius: 9,
    borderWidth: 2,
    height: 18,
    width: 18
  }
});
