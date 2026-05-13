import { ghostPosition, GhostPoint } from "./ghostEngine";

const samplePoints: GhostPoint[] = [
  {
    lat: 10,
    lng: 20,
    timestamp: 1000
  },
  {
    lat: 20,
    lng: 40,
    timestamp: 3000
  },
  {
    lat: 30,
    lng: 60,
    timestamp: 5000
  }
];

const output = ghostPosition(samplePoints, 1000);

console.log("[GhostStrategist] ghostEngine test output", output);
