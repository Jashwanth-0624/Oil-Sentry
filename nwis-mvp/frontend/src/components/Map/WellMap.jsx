import React, { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";
import StatusBadge from "../common/StatusBadge";

// Fix Leaflet default icon issues in bundled environments
const customWellIcon = (color = "#d97706") =>
  L.divIcon({
    className: "custom-well-marker",
    html: `<div style="
      width: 14px;
      height: 14px;
      background-color: ${color};
      border: 2px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 8px rgba(0,0,0,0.8), 0 0 10px ${color};
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

const currentWellIcon = L.divIcon({
  className: "custom-current-marker",
  html: `<div style="
    width: 20px;
    height: 20px;
    background-color: #ef4444;
    border: 3px solid #ffffff;
    border-radius: 50%;
    box-shadow: 0 0 12px #ef4444;
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function WellMap({
  wells = [],
  currentWellId = null,
  height = "380px",
  interactive = true,
}) {
  const navigate = useNavigate();

  // Filter wells with valid coordinates
  const validWells = useMemo(() => {
    return wells.filter(
      (w) =>
        w &&
        typeof w.latitude === "number" &&
        typeof w.longitude === "number" &&
        !isNaN(w.latitude) &&
        !isNaN(w.longitude)
    );
  }, [wells]);

  // Determine dynamic map center
  const center = useMemo(() => {
    if (validWells.length === 0) {
      return [23.7, 86.85]; // Default region if no wells
    }
    const current = validWells.find((w) => w.well_id === currentWellId);
    if (current) {
      return [current.latitude, current.longitude];
    }
    const avgLat =
      validWells.reduce((sum, w) => sum + w.latitude, 0) / validWells.length;
    const avgLon =
      validWells.reduce((sum, w) => sum + w.longitude, 0) / validWells.length;
    return [avgLat, avgLon];
  }, [validWells, currentWellId]);

  return (
    <div className="well-map-wrapper" style={{ height }}>
      <MapContainer
        center={center}
        zoom={validWells.length === 1 ? 13 : 11}
        scrollWheelZoom={interactive}
        dragging={interactive}
        style={{ height: "100%", width: "100%", background: "#0b0f14" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {validWells.map((well) => {
          const isCurrent = well.well_id === currentWellId;
          const icon = isCurrent
            ? currentWellIcon
            : customWellIcon(
                well.status === "Producing"
                  ? "#10b981"
                  : well.status === "Drilling"
                  ? "#f59e0b"
                  : "#d97706"
              );

          return (
            <Marker
              key={well.well_id}
              position={[well.latitude, well.longitude]}
              icon={icon}
            >
              <Popup>
                <div style={{ color: "#1e293b", minWidth: 150 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      marginBottom: 4,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{well.well_id}</span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      {well.field}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>
                    Depth: <strong>{well.total_depth ?? "N/A"} m</strong>
                  </div>
                  <div style={{ fontSize: 12, marginBottom: 8 }}>
                    Status: <StatusBadge status={well.status} />
                  </div>
                  <button
                    onClick={() => navigate(`/app/wells/${well.well_id}`)}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "5px 8px",
                      background: "#d97706",
                      color: "#ffffff",
                      borderRadius: 4,
                      border: "none",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    View Well Intelligence &rarr;
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
