import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import { DashboardLayout } from "../../../components/layout/DashboardLayout";
import "./DeliveryFarmMap.css";
import { processLocation } from "./mapUtils";
import type { FarmDetails } from "./types";

const deliveryItems = [
  { label: "Overview", href: "/dashboard/delivery" },
  { label: "Tasks", href: "/dashboard/delivery" },
  { label: "Contacts", href: "/dashboard/delivery" },
  { label: "Farm Map", href: "/delivery/farm-map" },
];

export default function DeliveryFarmMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const [addressQuery, setAddressQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userMarker, setUserMarker] = useState<L.Marker | null>(null);
  const [farmMarkers, setFarmMarkers] = useState<L.Marker[]>([]);
  const [routeControl, setRouteControl] = useState<L.Control | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "Search an address or use your live location."
  );
  const [farmDetails, setFarmDetails] = useState<FarmDetails | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
      return;
    }

    const map = L.map(mapRef.current, { zoomControl: false }).setView([20, 0], 2);
    L.control.zoom({ position: "topright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const runLocationProcess = (lat: number, lng: number) => {
    const map = mapInstanceRef.current;
    if (!map) {
      return;
    }

    processLocation({
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
    });
  };

  const onSearchAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedAddress = addressQuery.trim();
    if (!trimmedAddress) {
      setStatusMessage("Enter an address to search.");
      return;
    }

    setIsLoading(true);
    setStatusMessage("Searching address...");

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmedAddress)}&limit=1`
      );

      if (!response.ok) {
        throw new Error("Address search failed");
      }

      const result = (await response.json()) as Array<{ lat: string; lon: string }>;
      if (!result.length) {
        setStatusMessage("Address not found. Try a more specific search.");
        setFarmDetails(null);
        return;
      }

      const lat = Number(result[0].lat);
      const lng = Number(result[0].lon);
      mapInstanceRef.current?.setView([lat, lng], 13);
      runLocationProcess(lat, lng);
    } catch {
      setStatusMessage("Could not search this address right now.");
      setFarmDetails(null);
    } finally {
      setIsLoading(false);
    }
  };

  const onUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatusMessage("Geolocation is not supported in this browser.");
      return;
    }

    setIsLoading(true);
    setStatusMessage("Locating you...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        mapInstanceRef.current?.setView([latitude, longitude], 13);
        runLocationProcess(latitude, longitude);
        setIsLoading(false);
      },
      () => {
        setStatusMessage("Unable to access your location.");
        setFarmDetails(null);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  return (
    <DashboardLayout title="Delivery Dashboard" items={deliveryItems}>
      <div className="delivery-map-container">
        <div ref={mapRef} className="delivery-map-canvas" />

        <section className="delivery-map-panel">
          <h1 className="delivery-map-header">FarmFinder</h1>

          <form className="delivery-map-search-wrap" onSubmit={onSearchAddress}>
            <input
              className="delivery-map-input"
              type="text"
              value={addressQuery}
              onChange={(event) => setAddressQuery(event.target.value)}
              placeholder="Search address"
              aria-label="Search address"
            />
            <button className="delivery-map-btn" type="submit" disabled={isLoading}>
              Search
            </button>
          </form>

          <button
            className="delivery-map-btn delivery-map-btn-full"
            type="button"
            onClick={onUseCurrentLocation}
            disabled={isLoading}
          >
            Find Nearest Farm
          </button>

          <p className="delivery-map-status">{statusMessage}</p>

          {farmDetails && (
            <article className="delivery-map-details">
              <h2 className="delivery-map-details-title">Nearest farmer</h2>
              <p>
                <strong>Name:</strong> {farmDetails.farmer.name}
              </p>
              <p>
                <strong>Produce:</strong> {farmDetails.farmer.produce}
              </p>
              <p>
                <strong>Distance:</strong> {farmDetails.distanceKm} km
              </p>
            </article>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
