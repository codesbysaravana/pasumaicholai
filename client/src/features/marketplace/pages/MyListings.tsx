import { useEffect, useMemo, useState, type FormEvent } from "react";
import { DashboardLayout } from "../../../components/layout/DashboardLayout";
import { deleteCropListing, getMyCropListings, updateCropListing } from "../api";
import type { CropCategory, CropListing } from "../types";
import { Pagination } from "../../../components/ui/Pagination";

const ITEMS_PER_PAGE = 6;

const farmerItems = [
  { label: "Overview", href: "/dashboard/farmer" },
  { label: "Marketplace", href: "/dashboard/farmer/marketplace" },
  { label: "Consultation", href: "/dashboard/farmer/expert-consultation" },
  { label: "Complaints", href: "/dashboard/farmer/complaints" },
];

interface EditState {
  listingId: string;
  cropName: string;
  category: CropCategory;
  quantity: number;
  pricePerKg: number;
  location: string;
  description: string;
}

export function MyListingsPage() {
  const [listings, setListings] = useState<CropListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const loadListings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMyCropListings();
      setListings(data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load your listings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadListings();
  }, []);

  const totalPages = Math.ceil(listings.length / ITEMS_PER_PAGE);
  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return listings.slice(start, start + ITEMS_PER_PAGE);
  }, [listings, currentPage]);

  const startEdit = (listing: CropListing) => {
    setEditState({
      listingId: listing.id,
      cropName: listing.cropName,
      category: listing.category,
      quantity: listing.quantity,
      pricePerKg: listing.pricePerKg,
      location: listing.location,
      description: listing.description,
    });
  };

  const onUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editState) {
      return;
    }

    setError(null);
    try {
      await updateCropListing(editState.listingId, {
        cropName: editState.cropName,
        category: editState.category,
        quantity: editState.quantity,
        pricePerKg: editState.pricePerKg,
        location: editState.location,
        description: editState.description,
      });
      setEditState(null);
      await loadListings();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update listing.");
    }
  };

  const onDelete = async (listingId: string) => {
    setError(null);
    try {
      await deleteCropListing(listingId);
      setListings((previous) => previous.filter((listing) => listing.id !== listingId));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to delete listing.");
    }
  };

  return (
    <DashboardLayout title="My Crop Listings" items={farmerItems}>
      <section className="marketplace-page">
        <header className="marketplace-premium-hero">
          <h1>My Listings</h1>
          <p>Manage, edit, or remove your published crop listings to keep your stock and pricing up to date.</p>
        </header>

        {isLoading ? <div className="card loader">Loading your listings...</div> : null}
        {error ? <div className="card">{error}</div> : null}

        {editState ? (
          <form className="card stack" onSubmit={(event) => void onUpdate(event)} style={{ marginBottom: "2rem" }}>
            <h3>Edit Listing</h3>
            <input
              className="input"
              value={editState.cropName}
              placeholder="Crop Name"
              onChange={(event) => setEditState((previous) => (previous ? { ...previous, cropName: event.target.value } : previous))}
            />
            <select
              className="input"
              value={editState.category}
              onChange={(event) =>
                setEditState((previous) => (previous ? { ...previous, category: event.target.value as CropCategory } : previous))
              }
            >
              <option value="fruit">fruit</option>
              <option value="vegetable">vegetable</option>
              <option value="grain">grain</option>
              <option value="other">other</option>
            </select>
            <input
              className="input"
              type="number"
              min={1}
              value={editState.quantity}
              onChange={(event) =>
                setEditState((previous) => (previous ? { ...previous, quantity: Number(event.target.value) } : previous))
              }
            />
            <input
              className="input"
              type="number"
              min={1}
              value={editState.pricePerKg}
              onChange={(event) =>
                setEditState((previous) => (previous ? { ...previous, pricePerKg: Number(event.target.value) } : previous))
              }
            />
            <input
              className="input"
              value={editState.location}
              onChange={(event) => setEditState((previous) => (previous ? { ...previous, location: event.target.value } : previous))}
            />
            <textarea
              className="input"
              rows={3}
              value={editState.description}
              onChange={(event) =>
                setEditState((previous) => (previous ? { ...previous, description: event.target.value } : previous))
              }
            />
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditState(null)}>
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {!isLoading && !error && (
          <div className="stack">
            <section className="marketplace-modern-grid">
              {paginatedListings.map((listing) => (
                <article key={listing.id} className="marketplace-premium-card">
                  <div className="marketplace-img-wrapper">
                    <div className="marketplace-premium-badge">{listing.status.toUpperCase()}</div>
                    <img
                      src={listing.images[0] || "https://placehold.co/600x400?text=Fresh+Crop"}
                      alt={listing.cropName}
                      className="marketplace-img"
                    />
                  </div>

                  <div className="marketplace-premium-content">
                    <span className="marketplace-subtitle">{listing.category}</span>
                    <h3 className="marketplace-premium-title">{listing.cropName}</h3>

                    <div className="marketplace-details-row">
                      <div className="marketplace-premium-price">
                        <span className="marketplace-price-value">₹{listing.pricePerKg}</span>
                        <span className="marketplace-price-label">per kg</span>
                      </div>
                      <div className="marketplace-quantity-badge">
                        {listing.quantity} {listing.unit || "kg"}
                      </div>
                    </div>
                  </div>

                  <div className="marketplace-info-footer">
                    <div className="marketplace-footer-item">
                      <span>📍</span> {listing.location}
                    </div>
                  </div>

                  <div className="marketplace-premium-actions">
                    <button type="button" className="btn btn-secondary w-full" onClick={() => startEdit(listing)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-danger w-full" onClick={() => void onDelete(listing.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </section>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

      </section>
    </DashboardLayout>
  );
}
