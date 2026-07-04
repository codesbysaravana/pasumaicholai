import L from "leaflet";
import type { FarmDetails, Farmer } from "./types";

const PRODUCE_TYPES = ["Tomatoes", "Bananas", "Rice", "Carrots", "Onions"];

const markerShadowUrl =
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png";

export const userIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export const farmIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface RoutingOptions {
  waypoints: L.LatLng[];
  show: boolean;
  addWaypoints: boolean;
  draggableWaypoints: boolean;
  routeWhileDragging: boolean;
  fitSelectedRoutes: boolean;
  lineOptions: { styles: Array<{ color: string; opacity: number; weight: number }> };
  createMarker: () => null;
}

interface RoutingControl {
  addTo(map: L.Map): L.Control;
}

interface RoutingNamespace {
  control(options: RoutingOptions): RoutingControl;
}

export interface ClearMapDataParams {
  map: L.Map;
  userMarker: L.Marker | null;
  farmMarkers: L.Marker[];
  routeControl: L.Control | null;
  setUserMarker: (marker: L.Marker | null) => void;
  setFarmMarkers: (markers: L.Marker[]) => void;
  setRouteControl: (control: L.Control | null) => void;
}

export interface ProcessLocationParams extends ClearMapDataParams {
  lat: number;
  lng: number;
  setStatusMessage: (message: string) => void;
  setFarmDetails: (details: FarmDetails | null) => void;
}

export function generateDummyFarmers(userLat: number, userLng: number, count = 6): Farmer[] {
  return Array.from({ length: count }, (_, index) => {
    const latOffset = (Math.random() - 0.5) * 0.18;
    const lngOffset = (Math.random() - 0.5) * 0.18;
    return {
      id: index + 1,
      name: `Farmer ${index + 1}`,
      produce: PRODUCE_TYPES[index % PRODUCE_TYPES.length],
      lat: userLat + latOffset,
      lng: userLng + lngOffset,
    };
  });
}

export function clearMapData({
  map,
  userMarker,
  farmMarkers,
  routeControl,
  setUserMarker,
  setFarmMarkers,
  setRouteControl,
}: ClearMapDataParams): void {
  if (userMarker) {
    map.removeLayer(userMarker);
    setUserMarker(null);
  }

  farmMarkers.forEach((marker) => map.removeLayer(marker));
  setFarmMarkers([]);

  if (routeControl) {
    map.removeControl(routeControl);
    setRouteControl(null);
  }
}

export function processLocation({
  map,
  lat,
  lng,
  userMarker,
  farmMarkers,
  routeControl,
  setUserMarker,
  setFarmMarkers,
  setRouteControl,
  setStatusMessage,
  setFarmDetails,
}: ProcessLocationParams): void {
  clearMapData({
    map,
    userMarker,
    farmMarkers,
    routeControl,
    setUserMarker,
    setFarmMarkers,
    setRouteControl,
  });

  const createdUserMarker = L.marker([lat, lng], { icon: userIcon })
    .addTo(map)
    .bindPopup("You are here")
    .openPopup();
  setUserMarker(createdUserMarker);

  const farmers = generateDummyFarmers(lat, lng);
  const createdFarmMarkers = farmers.map((farmer) =>
    L.marker([farmer.lat, farmer.lng], { icon: farmIcon })
      .addTo(map)
      .bindPopup(`<strong>${farmer.name}</strong><br/>Produce: ${farmer.produce}`)
  );
  setFarmMarkers(createdFarmMarkers);

  const nearestFarmer = farmers.reduce((closest, current) => {
    const currentDistance = map.distance([lat, lng], [current.lat, current.lng]);
    const closestDistance = map.distance([lat, lng], [closest.lat, closest.lng]);
    return currentDistance < closestDistance ? current : closest;
  }, farmers[0]);

  const distanceMeters = map.distance([lat, lng], [nearestFarmer.lat, nearestFarmer.lng]);
  const distanceKm = Number((distanceMeters / 1000).toFixed(2));
  setFarmDetails({ farmer: nearestFarmer, distanceKm });

  const maybeRouting = (L as unknown as { Routing?: RoutingNamespace }).Routing;
  if (!maybeRouting) {
    setStatusMessage(`Nearest farmer: ${nearestFarmer.name} (${distanceKm} km away).`);
    map.setView([lat, lng], 13);
    return;
  }

  const createdRouteControl = maybeRouting
    .control({
      waypoints: [L.latLng(lat, lng), L.latLng(nearestFarmer.lat, nearestFarmer.lng)],
      show: false,
      addWaypoints: false,
      draggableWaypoints: false,
      routeWhileDragging: false,
      fitSelectedRoutes: true,
      lineOptions: {
        styles: [{ color: "#0ea5e9", opacity: 0.9, weight: 5 }],
      },
      createMarker: () => null,
    })
    .addTo(map);

  setRouteControl(createdRouteControl as unknown as L.Control);
  setStatusMessage(`Nearest farmer: ${nearestFarmer.name} (${distanceKm} km away).`);
}
