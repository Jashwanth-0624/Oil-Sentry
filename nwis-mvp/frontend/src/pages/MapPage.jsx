import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import StatusBadge from "../components/common/StatusBadge";
import { getWells, getSimilarWells } from "../services/api";
import {
  MapPin,
  Search,
  Layers,
  Compass,
  ArrowUpRight,
  Maximize2,
  RefreshCw,
  Info,
  SlidersHorizontal,
  Activity,
  CheckCircle,
  ChevronRight,
  Eye,
} from "lucide-react";

/**
 * Creates custom technical HTML markers using L.divIcon.
 * Eliminates bundler asset resolution failures for default Leaflet icons.
 */
function createMarkerIcon({
  isSelected = false,
  isSimilar = false,
  similarityScore = null,
  status = "Producing",
  wellId = "",
}) {
  let bgColor = "#22c55e"; // Producing (emerald)
  let borderColor = "#ffffff";
  let size = 16;
  let pulseClass = "";

  if (status === "Completed") {
    bgColor = "#7b8c9e"; // Technical steel
  } else if (status === "Abandoned") {
    bgColor = "#475569"; // Slate dim
  }

  if (isSimilar) {
    bgColor = "#38bdf8"; // Cyan / Blue-Steel
    borderColor = "#ffffff";
    size = 18;
  }

  if (isSelected) {
    bgColor = "#d4973b"; // Petroleum amber
    borderColor = "#ffffff";
    size = 22;
    pulseClass = "marker-selected-pulse";
  }

  const badgeHtml = isSimilar && similarityScore
    ? `<div style="
        position: absolute;
        top: -18px;
        left: 50%;
        transform: translateX(-50%);
        background: #0c1017;
        color: #38bdf8;
        border: 1px solid #38bdf8;
        font-family: var(--font-mono, monospace);
        font-size: 9px;
        font-weight: 700;
        padding: 1px 4px;
        border-radius: 4px;
        white-space: nowrap;
        pointer-events: none;
      ">${Math.round(similarityScore)}%</div>`
    : "";

  const labelHtml = isSelected
    ? `<div style="
        position: absolute;
        bottom: -18px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(7, 9, 14, 0.9);
        color: #d4973b;
        border: 1px solid #d4973b;
        font-family: var(--font-mono, monospace);
        font-size: 10px;
        font-weight: 700;
        padding: 1px 5px;
        border-radius: 4px;
        white-space: nowrap;
        pointer-events: none;
      ">${wellId}</div>`
    : "";

  const html = `
    <div style="position: relative; width: ${size}px; height: ${size}px;">
      ${badgeHtml}
      <div class="${pulseClass}" style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${bgColor};
        border: 2px solid ${borderColor};
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.75);
        transition: transform 0.15s ease;
      "></div>
      ${labelHtml}
    </div>
  `;

  return L.divIcon({
    className: "spatial-well-marker",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

/**
 * Helper component to automatically adjust Leaflet bounds to fit valid wells.
 */
function MapBoundsController({ wells, triggerFit }) {
  const map = useMap();

  useEffect(() => {
    if (!wells || wells.length === 0) return;
    const latLngs = wells
      .filter((w) => typeof w.latitude === "number" && typeof w.longitude === "number")
      .map((w) => [w.latitude, w.longitude]);

    if (latLngs.length > 0) {
      try {
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      } catch (err) {
        console.warn("Could not fit map bounds:", err);
      }
    }
  }, [wells, triggerFit, map]);

  return null;
}

export default function MapPage() {
  const navigate = useNavigate();

  // State
  const [wells, setWells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedField, setSelectedField] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [fitTrigger, setFitTrigger] = useState(0);

  // Selected Well & Offset Similarity
  const [selectedWell, setSelectedWell] = useState(null);
  const [similarityData, setSimilarityData] = useState(null);
  const [similarityLoading, setSimilarityLoading] = useState(false);

  // Fetch well registry from FastAPI
  const fetchWells = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWells();
      setWells(data || []);
      // Default to first well if available
      if (data && data.length > 0 && !selectedWell) {
        setSelectedWell(data[0]);
      }
    } catch (err) {
      console.error("Failed to load wells for spatial map:", err);
      setError(err.message || "Unable to connect to the NWIS backend.");
    } finally {
      setLoading(false);
    }
  }, [selectedWell]);

  useEffect(() => {
    fetchWells();
  }, [fetchWells]);

  // Fetch similarity when selected well changes
  useEffect(() => {
    if (!selectedWell) {
      setSimilarityData(null);
      return;
    }

    let isMounted = true;
    async function loadSimilarity() {
      try {
        setSimilarityLoading(true);
        const data = await getSimilarWells(selectedWell.well_id, 10, 5);
        if (isMounted) {
          setSimilarityData(data);
        }
      } catch (err) {
        console.warn("Could not fetch similarity for well:", selectedWell.well_id, err);
        if (isMounted) {
          setSimilarityData(null);
        }
      } finally {
        if (isMounted) setSimilarityLoading(false);
      }
    }

    loadSimilarity();
    return () => {
      isMounted = false;
    };
  }, [selectedWell]);

  // Derive unique filter options dynamically from loaded wells
  const availableFields = useMemo(() => {
    const fields = new Set(wells.map((w) => w.field).filter(Boolean));
    return Array.from(fields).sort();
  }, [wells]);

  const availableStatuses = useMemo(() => {
    const statuses = new Set(wells.map((w) => w.status).filter(Boolean));
    return Array.from(statuses).sort();
  }, [wells]);

  const availableTypes = useMemo(() => {
    const types = new Set(wells.map((w) => w.well_type).filter(Boolean));
    return Array.from(types).sort();
  }, [wells]);

  // Filter wells
  const filteredWells = useMemo(() => {
    return wells.filter((w) => {
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesId = w.well_id.toLowerCase().includes(query);
        const matchesField = w.field && w.field.toLowerCase().includes(query);
        if (!matchesId && !matchesField) return false;
      }
      if (selectedField !== "ALL" && w.field !== selectedField) return false;
      if (selectedStatus !== "ALL" && w.status !== selectedStatus) return false;
      if (selectedType !== "ALL" && w.well_type !== selectedType) return false;
      return true;
    });
  }, [wells, searchQuery, selectedField, selectedStatus, selectedType]);

  // Keep selectedWell synchronized with filteredWells (Step 15)
  useEffect(() => {
    if (selectedWell && filteredWells.length > 0) {
      const isVisible = filteredWells.some((w) => w.well_id === selectedWell.well_id);
      if (!isVisible) {
        setSelectedWell(filteredWells[0]);
      }
    } else if (filteredWells.length === 0 && selectedWell) {
      setSelectedWell(null);
    }
  }, [filteredWells, selectedWell]);


  // Map of similar well IDs with similarity score
  const similarWellsMap = useMemo(() => {
    const map = new Map();
    if (similarityData && similarityData.results) {
      similarityData.results.forEach((item) => {
        map.set(item.well_id, item);
      });
    }
    return map;
  }, [similarityData]);

  // Derived metrics
  const producingCount = useMemo(
    () => wells.filter((w) => w.status === "Producing").length,
    [wells]
  );
  const completedCount = useMemo(
    () => wells.filter((w) => w.status === "Completed").length,
    [wells]
  );

  // Initial geographic center calculation
  const initialCenter = useMemo(() => {
    if (wells.length === 0) return [23.75, 87.0];
    const avgLat = wells.reduce((sum, w) => sum + (w.latitude || 0), 0) / wells.length;
    const avgLon = wells.reduce((sum, w) => sum + (w.longitude || 0), 0) / wells.length;
    return [avgLat, avgLon];
  }, [wells]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedField !== "ALL" ||
    selectedStatus !== "ALL" ||
    selectedType !== "ALL";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedField("ALL");
    setSelectedStatus("ALL");
    setSelectedType("ALL");
    setFitTrigger((prev) => prev + 1);
  };

  return (
    <div>
      <PageHeader
        title="Field Spatial Intelligence"
        subtitle="Explore wells, spatial relationships, and offset intelligence"
        badge={
          <span className="badge badge-normal" style={{ marginLeft: 12 }}>
            <Compass size={12} /> PostGIS SRID 4326 Active
          </span>
        }
      />

      {/* Top Metrics Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div className="card" style={{ padding: "12px 16px" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            TOTAL WELLS (API)
          </div>
          <div className="font-mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginTop: 4 }}>
            {wells.length}
          </div>
        </div>

        <div className="card" style={{ padding: "12px 16px" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            PRODUCING WELLS
          </div>
          <div className="font-mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--status-normal)", marginTop: 4 }}>
            {producingCount}
          </div>
        </div>

        <div className="card" style={{ padding: "12px 16px" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            COMPLETED WELLS
          </div>
          <div className="font-mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--accent-steel)", marginTop: 4 }}>
            {completedCount}
          </div>
        </div>

        <div className="card" style={{ padding: "12px 16px" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            OPERATIONAL FIELDS
          </div>
          <div className="font-mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--accent-amber)", marginTop: 4 }}>
            {availableFields.length}
          </div>
        </div>

        <div className="card" style={{ padding: "12px 16px" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            SELECTED TARGET
          </div>
          <div className="font-mono" style={{ fontSize: 20, fontWeight: 700, color: selectedWell ? "var(--accent-amber)" : "var(--text-muted)", marginTop: 4 }}>
            {selectedWell ? selectedWell.well_id : "None"}
          </div>
        </div>
      </div>

      {/* Control & Filter Toolbar */}
      <div
        className="panel"
        style={{
          marginBottom: 16,
          padding: "12px 16px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, flex: 1, minWidth: 280 }}>
          {/* Search Input */}
          <div style={{ position: "relative", minWidth: 220, flex: "1 1 220px" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              placeholder="Search by Well ID or Field..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ paddingLeft: 30, fontSize: 12, width: "100%" }}
            />
          </div>

          {/* Field Filter */}
          <div style={{ minWidth: 130 }}>
            <select
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value)}
              className="select font-mono"
              style={{ fontSize: 12, width: "100%" }}
            >
              <option value="ALL">All Fields</option>
              {availableFields.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: 130 }}>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="select font-mono"
              style={{ fontSize: 12, width: "100%" }}
            >
              <option value="ALL">All Statuses</option>
              {availableStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div style={{ minWidth: 140 }}>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="select font-mono"
              style={{ fontSize: 12, width: "100%" }}
            >
              <option value="ALL">All Well Types</option>
              {availableTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setFitTrigger((prev) => prev + 1)}
            style={{ fontSize: 12, padding: "7px 12px" }}
            title="Recenter and fit map to visible wells"
          >
            <Maximize2 size={13} />
            <span>Fit All Wells</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              className="button button-ghost"
              onClick={resetFilters}
              style={{ fontSize: 12, padding: "7px 10px", color: "var(--accent-amber)" }}
            >
              <RefreshCw size={13} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Interactive Map (Left/Center) + Spatial Intelligence Dossier (Right) */}
      <div className="grid-split-2-1" style={{ minHeight: "560px", alignItems: "stretch" }}>
        {/* Map Viewport Container */}
        <div
          className="panel spatial-map-dark-tiles"
          style={{
            position: "relative",
            minHeight: "540px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {loading && (
            <div style={{ padding: 40 }}>
              <LoadingState message="Retrieving geospatial well coordinates from PostGIS database..." />
            </div>
          )}

          {!loading && error && (
            <div style={{ padding: 40 }}>
              <ErrorState
                title="Spatial Data Unavailable"
                message={error}
                onRetry={fetchWells}
              />
            </div>
          )}

          {!loading && !error && filteredWells.length === 0 && (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                color: "var(--text-muted)",
              }}
            >
              <Layers size={36} style={{ color: "var(--accent-steel)", opacity: 0.5 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                No Wells Match Filter Criteria
              </div>
              <div style={{ fontSize: 13, maxWidth: 360 }}>
                Adjust or clear your search term and filter dropdowns to visualize offset wells.
              </div>
              <button
                type="button"
                className="button button-secondary"
                onClick={resetFilters}
                style={{ marginTop: 8 }}
              >
                Reset All Filters
              </button>
            </div>
          )}

          {!loading && !error && filteredWells.length > 0 && (
            <div style={{ flex: 1, position: "relative", width: "100%", height: "100%", minHeight: "540px" }}>
              <MapContainer
                center={initialCenter}
                zoom={11}
                scrollWheelZoom={true}
                style={{ width: "100%", height: "100%", minHeight: "540px", background: "var(--bg-primary)" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={18}
                />

                <MapBoundsController wells={filteredWells} triggerFit={fitTrigger} />

                {/* Search Radius Circle for Selected Well */}
                {selectedWell &&
                  typeof selectedWell.latitude === "number" &&
                  typeof selectedWell.longitude === "number" && (
                    <Circle
                      center={[selectedWell.latitude, selectedWell.longitude]}
                      radius={10000} // 10 km similarity search radius
                      pathOptions={{
                        color: "#d4973b",
                        weight: 1,
                        dashArray: "4, 6",
                        fillColor: "#d4973b",
                        fillOpacity: 0.05,
                      }}
                    />
                  )}

                {/* Well Markers */}
                {filteredWells.map((well) => {
                  const isSelected = selectedWell?.well_id === well.well_id;
                  const similarInfo = similarWellsMap.get(well.well_id);
                  const isSimilar = Boolean(similarInfo);
                  const similarityScore = similarInfo?.similarity_score || null;

                  const icon = createMarkerIcon({
                    isSelected,
                    isSimilar,
                    similarityScore,
                    status: well.status,
                    wellId: well.well_id,
                  });

                  return (
                    <Marker
                      key={well.well_id}
                      position={[well.latitude, well.longitude]}
                      icon={icon}
                      zIndexOffset={isSelected ? 1000 : isSimilar ? 500 : 100}
                      eventHandlers={{
                        click: () => {
                          setSelectedWell(well);
                        },
                      }}
                    >
                      <Popup>
                        <div style={{ minWidth: 170 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              borderBottom: "1px solid var(--border-subtle)",
                              paddingBottom: 6,
                              marginBottom: 8,
                            }}
                          >
                            <span className="font-mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                              {well.well_id}
                            </span>
                            <span style={{ fontSize: 11, color: "var(--accent-amber)" }}>
                              {well.field}
                            </span>
                          </div>

                          <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "var(--text-muted)" }}>Status:</span>
                              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{well.status}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "var(--text-muted)" }}>Well Type:</span>
                              <span style={{ color: "var(--text-primary)" }}>{well.well_type}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "var(--text-muted)" }}>Total Depth:</span>
                              <span className="font-mono" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                {well.total_depth != null ? `${well.total_depth} m` : "N/A"}
                              </span>
                            </div>
                            {isSimilar && similarInfo && (
                              <div
                                style={{
                                  borderTop: "1px dashed var(--border-subtle)",
                                  paddingTop: 4,
                                  marginTop: 4,
                                  color: "var(--status-info)",
                                  fontSize: 11,
                                }}
                              >
                                Similarity: {similarInfo.similarity_score}% ({similarInfo.distance_km.toFixed(2)} km)
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => navigate(`/app/wells/${well.well_id}`)}
                            className="button button-primary"
                            style={{ width: "100%", padding: "5px 8px", fontSize: 11, justifyContent: "center" }}
                          >
                            <span>View Well Dossier</span>
                            <ArrowUpRight size={12} />
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* Floating Map Legend (Bottom Right) */}
              <div
                style={{
                  position: "absolute",
                  bottom: 24,
                  right: 12,
                  zIndex: 1000,
                  backgroundColor: "rgba(17, 23, 34, 0.92)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 14px",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  boxShadow: "var(--shadow-md)",
                  pointerEvents: "auto",
                }}
              >
                <div style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 6 }}>
                  MAP LEGEND
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#d4973b", border: "1px solid #fff" }} />
                    <span>Selected Well</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#38bdf8", border: "1px solid #fff" }} />
                    <span>Similar Offset Well</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#22c55e", border: "1px solid #fff" }} />
                    <span>Producing Well</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#7b8c9e", border: "1px solid #fff" }} />
                    <span>Completed Well</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#475569", border: "1px solid #fff" }} />
                    <span>Abandoned Well</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                    <div style={{ width: 16, height: 0, borderTop: "1px dashed #d4973b" }} />
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>10 km Proximity Radius</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Selected Well Intelligence Dossier */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {selectedWell ? (
            <div className="panel" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div className="panel-header">
                <div className="panel-title">
                  <MapPin size={16} />
                  <span>Selected Well Spatial Profile</span>
                </div>
                <StatusBadge status={selectedWell.status} />
              </div>

              <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    WELL IDENTIFIER
                  </div>
                  <div className="font-mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--accent-amber)", marginTop: 2 }}>
                    {selectedWell.well_id}
                  </div>
                </div>

                {/* Spatial Coordinates & Field Profile */}
                <div
                  style={{
                    backgroundColor: "var(--bg-primary)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    padding: "12px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>FIELD</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginTop: 2 }}>
                      {selectedWell.field}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>WELL TYPE</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginTop: 2 }}>
                      {selectedWell.well_type}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>TOTAL DEPTH</div>
                    <div className="font-mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginTop: 2 }}>
                      {selectedWell.total_depth != null ? `${selectedWell.total_depth} m` : "N/A"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>POSTGIS POINT</div>
                    <div className="font-mono" style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                      {selectedWell.latitude?.toFixed(4)}, {selectedWell.longitude?.toFixed(4)}
                    </div>
                  </div>
                </div>

                {/* Nearby Offset Similar Wells */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--text-muted)",
                      marginBottom: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>NEARBY OFFSET SIMILARITY (10 KM)</span>
                    {similarityLoading && (
                      <span className="font-mono" style={{ fontSize: 10, color: "var(--accent-amber)" }}>
                        Computing...
                      </span>
                    )}
                  </div>

                  {similarityData && similarityData.results && similarityData.results.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {similarityData.results.map((sim) => (
                        <div
                          key={sim.well_id}
                          onClick={() => {
                            const found = wells.find((w) => w.well_id === sim.well_id);
                            if (found) setSelectedWell(found);
                          }}
                          style={{
                            padding: "8px 10px",
                            backgroundColor: "var(--bg-primary)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-sm)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                            transition: "border-color 0.15s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent-amber)")}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span className="font-mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                                {sim.well_id}
                              </span>
                              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                                {sim.field}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                              Distance: <span className="font-mono">{sim.distance_km.toFixed(2)} km</span>
                            </div>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <span
                              className="font-mono"
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: sim.similarity_score >= 80 ? "var(--status-normal)" : "var(--accent-amber)",
                              }}
                            >
                              {sim.similarity_score}%
                            </span>
                            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Similarity</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 0" }}>
                      {similarityLoading ? "Evaluating spatial proximity..." : "No offset wells within 10 km search radius."}
                    </div>
                  )}
                </div>

                {/* Dossier Navigation Action */}
                <button
                  type="button"
                  onClick={() => navigate(`/app/wells/${selectedWell.well_id}`)}
                  className="button button-primary"
                  style={{ width: "100%", padding: "10px", justifyContent: "center" }}
                >
                  <Eye size={15} />
                  <span>Open Well Dossier ({selectedWell.well_id})</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="panel" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "var(--text-muted)" }}>
                <MapPin size={32} style={{ color: "var(--accent-steel)", opacity: 0.5 }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                  No Well Selected
                </div>
                <div style={{ fontSize: 12, maxWidth: 260 }}>
                  Click on any well marker on the geospatial map to view coordinates, metadata, and offset similarity analysis.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
