import { useEffect, useRef, useState } from "react";
import { getUserById } from "../../api/userApi";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { ComplaintForm } from "./components/ComplaintForm";
import { FarmerComplaintsList } from "./components/FarmerComplaintsList";
import { reverseGeocodeCoordinates } from "./utils/reverseGeocode";

const farmerItems = [
  { label: "Overview", href: "/dashboard/farmer" },
  { label: "Marketplace", href: "/dashboard/farmer/marketplace" },
  { label: "Recommended Prices", href: "/dashboard/farmer/recommended-prices" },
  { label: "Consultation", href: "/dashboard/farmer/expert-consultation" },
  { label: "Complaints", href: "/dashboard/farmer/complaints" },
];

interface GeoState {
  location: string;
  latitude?: number;
  longitude?: number;
  ward?: string;
  city?: string;
  state?: string;
}

export function FarmerComplaintPage() {
  const { auth } = useAuth();
  const [farmerPhone, setFarmerPhone] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [geo, setGeo] = useState<GeoState>({ location: "Detecting location..." });
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"new" | "list">("new");
  const hasCapturedLocationRef = useRef(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!auth?.userId) {
        return;
      }
      setIsLoadingProfile(true);
      try {
        const profile = await getUserById(auth.userId);
        setFarmerPhone(profile.phone ?? "");
      } catch {
        setFarmerPhone("");
      } finally {
        setIsLoadingProfile(false);
      }
    };
    void loadProfile();
  }, [auth?.userId]);

  useEffect(() => {
    if (hasCapturedLocationRef.current) {
      return;
    }
    hasCapturedLocationRef.current = true;

    if (!navigator.geolocation) {
      setGeo({ location: "Location unavailable (browser not supported)." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        void (async () => {
          try {
            const resolved = await reverseGeocodeCoordinates(latitude, longitude);
            const locationLabel =
              resolved.ward || resolved.city || resolved.state
                ? [resolved.ward, resolved.city, resolved.state].filter(Boolean).join(", ")
                : "Coordinates captured (area unknown)";
            setGeo({
              location: locationLabel,
              latitude,
              longitude,
              ward: resolved.ward,
              city: resolved.city,
              state: resolved.state,
            });
          } catch {
            setGeo({
              location: "Coordinates captured (area unknown)",
              latitude,
              longitude,
            });
          }
        })();
      },
      () => {
        setGeo({ location: "Location unavailable. Please enter manually." });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  return (
    <DashboardLayout title="Farmer Complaints" items={farmerItems}>
      <section className="dashboard-page stack">
        <article className="card">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2>Grievance Complaint System</h2>
              <p className="muted">Submit complaints and track status updates from your assigned Taluk Admin.</p>
            </div>
            <div className="tab-group">
              <button
                type="button"
                className={`tab-btn ${activeTab === "new" ? "active" : ""}`}
                onClick={() => setActiveTab("new")}
              >
                New Complaint
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === "list" ? "active" : ""}`}
                onClick={() => setActiveTab("list")}
              >
                Track Status
              </button>
            </div>
          </div>
        </article>

        {isLoadingProfile ? <div className="card loader">Loading farmer profile...</div> : null}

        {activeTab === "new" && (
          <ComplaintForm
            farmerName={auth?.name ?? "Farmer"}
            farmerPhone={farmerPhone}
            initialLocation={geo.location}
            latitude={geo.latitude}
            longitude={geo.longitude}
            ward={geo.ward}
            city={geo.city}
            state={geo.state}
            onSubmitted={async () => {
              setRefreshKey((prev) => prev + 1);
              setActiveTab("list");
            }}
          />
        )}

        {activeTab === "list" && (
          <div key={refreshKey}>
            <FarmerComplaintsList />
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
