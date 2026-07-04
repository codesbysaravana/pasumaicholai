import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  getAdminCrops,
  triggerCropPriceRecalculation,
  updateCropPrice,
  uploadCropPriceCsv,
  type CropPriceRecord,
} from "../../api/cropPricingApi";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { adminNavItems } from "./adminNav";

function toCurrency(value: number): string {
  return `₹${value.toFixed(2)}`;
}

export function CropPriceManagementPage() {
  const [records, setRecords] = useState<CropPriceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedCrop, setSelectedCrop] = useState("");
  const [basePriceInput, setBasePriceInput] = useState("");

  // New UI States
  const [activeTab, setActiveTab] = useState<"manual" | "csv" | "system">("manual");
  const [showTable, setShowTable] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => a.crop.localeCompare(b.crop)),
    [records],
  );

  const loadCrops = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminCrops();
      setRecords(data);
      if (!selectedCrop && data.length > 0) {
        const firstCrop = data[0];
        if (firstCrop) {
          setSelectedCrop(firstCrop.crop);
          setBasePriceInput(String(firstCrop.base_price));
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load crop prices.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCrops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelectCrop = (crop: string) => {
    setSelectedCrop(crop);
    const item = records.find((entry) => entry.crop === crop);
    setBasePriceInput(item ? String(item.base_price) : "");
  };

  const onUploadCsv = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("pricesCsv");
    if (!(fileInput instanceof HTMLInputElement) || !fileInput.files || fileInput.files.length === 0) {
      setError("Please select a CSV file first.");
      return;
    }

    const file = fileInput.files[0];
    if (!file) {
      setError("CSV file is required.");
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadCropPriceCsv(file);
      setNotice(
        result.invalid_crops.length > 0
          ? `CSV updated ${result.updated} crops. Unknown names skipped: ${result.invalid_crops.join(", ")}`
          : `CSV updated ${result.updated} crops.`,
      );
      await loadCrops();
      form.reset();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload CSV.");
    } finally {
      setIsUploading(false);
    }
  };

  const onSaveManualPrice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!selectedCrop) {
      setError("Please select a crop.");
      return;
    }
    const parsed = Number(basePriceInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Base price must be a positive number.");
      return;
    }

    setIsSaving(true);
    try {
      await updateCropPrice({ crop_name: selectedCrop, base_price: parsed });
      setNotice(`Updated ${selectedCrop} price successfully.`);
      await loadCrops();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update crop price.");
    } finally {
      setIsSaving(false);
    }
  };

  const onRecalculate = async () => {
    setError(null);
    setNotice(null);
    setIsRecalculating(true);
    try {
      const result = await triggerCropPriceRecalculation();
      setNotice(`Recalculated ${result.recalculated} crops.`);
      await loadCrops();
    } catch (recalcError) {
      setError(recalcError instanceof Error ? recalcError.message : "Failed to recalculate crop prices.");
    } finally {
      setIsRecalculating(false);
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage);
  const paginatedRecords = sortedRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <DashboardLayout title="Crop Price Management" items={adminNavItems}>
      <section className="dashboard-page stack">
        <article className="card">
          <div className="flex justify-between items-start">
            <div>
              <h2>Crop Price Management</h2>
              <p className="muted">Manage base prices, upload CSV sheets, and trigger recalculations.</p>
            </div>
            <button
              className={`btn ${showTable ? "btn-secondary" : "btn-primary"}`}
              onClick={() => {
                setShowTable(!showTable);
                setCurrentPage(1);
              }}
            >
              {showTable ? "Hide Price Table" : "View All Crop Prices"}
            </button>
          </div>
        </article>

        {notice && <div className="card taluk-success">{notice}</div>}
        {error && <div className="card experts-error">{error}</div>}

        <article className="card">
          <div className="tab-group mb-6">
            <button
              className={`tab-btn ${activeTab === "manual" ? "active" : ""}`}
              onClick={() => setActiveTab("manual")}
            >
              Manual Update
            </button>
            <button
              className={`tab-btn ${activeTab === "csv" ? "active" : ""}`}
              onClick={() => setActiveTab("csv")}
            >
              CSV Upload
            </button>
            <button
              className={`tab-btn ${activeTab === "system" ? "active" : ""}`}
              onClick={() => setActiveTab("system")}
            >
              System Actions
            </button>
          </div>

          <div className="tab-content mt-4">
            {activeTab === "manual" && (
              <form className="stack" onSubmit={(event) => void onSaveManualPrice(event)}>
                <div className="grid grid-2 gap-4">
                  <label className="field">
                    <span className="field-label">Select Crop</span>
                    <select
                      className="input"
                      value={selectedCrop}
                      onChange={(event) => onSelectCrop(event.target.value)}
                    >
                      <option value="">Select crop</option>
                      {sortedRecords.map((entry) => (
                        <option key={entry.crop} value={entry.crop}>
                          {entry.crop}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">New Base Price (₹)</span>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      step={0.01}
                      value={basePriceInput}
                      onChange={(event) => setBasePriceInput(event.target.value)}
                      placeholder="Enter base price"
                    />
                  </label>
                </div>
                <button className="btn btn-primary w-full" type="submit" disabled={isSaving}>
                  {isSaving ? "Updating..." : "Update Base Price"}
                </button>
              </form>
            )}

            {activeTab === "csv" && (
              <div className="stack">
                <p className="muted mb-2">Upload a CSV file with format: <code>crop_name,base_price</code></p>
                <form className="stack" onSubmit={(event) => void onUploadCsv(event)}>
                  <input className="input" type="file" name="pricesCsv" accept=".csv,text/csv" />
                  <button className="btn btn-primary w-full" type="submit" disabled={isUploading}>
                    {isUploading ? "Uploading..." : "Upload & Sync Prices"}
                  </button>
                </form>
              </div>
            )}

            {activeTab === "system" && (
              <div className="stack">
                <p className="muted mb-4">Trigger a global recalculation of recommended prices based on current demand trends and base rates.</p>
                <button
                  className="btn btn-secondary w-full"
                  type="button"
                  onClick={() => void onRecalculate()}
                  disabled={isRecalculating}
                >
                  {isRecalculating ? "Recalculating..." : "Recalculate All Prices Now"}
                </button>
              </div>
            )}
          </div>
        </article>

        {showTable && (
          <article className="card experts-table-card">
            <div className="experts-table-header">
              <h3>Crop Price Table</h3>
              <span className="muted">{sortedRecords.length} crops in total</span>
            </div>

            {isLoading ? (
              <div className="p-8 text-center muted">Loading records...</div>
            ) : (
              <>
                <div className="experts-table-wrap">
                  <table className="experts-table">
                    <thead>
                      <tr>
                        <th>Crop</th>
                        <th>Category</th>
                        <th>Base Price</th>
                        <th>Recommended Price</th>
                        <th>Demand Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRecords.map((item) => (
                        <tr key={item.crop}>
                          <td>{item.crop}</td>
                          <td style={{ textTransform: "capitalize" }}>{item.category}</td>
                          <td>{toCurrency(item.base_price)}</td>
                          <td>{toCurrency(item.recommended_price)}</td>
                          <td>{item.demand_score.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-4 p-4 border-t border-white/5">
                    <button
                      className="btn btn-secondary"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      Previous
                    </button>
                    <span className="font-bold text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      className="btn btn-secondary"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </article>
        )}
      </section>
    </DashboardLayout>
  );
}
