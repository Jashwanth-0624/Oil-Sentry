import React from "react";
import StatusBadge from "../common/StatusBadge";
import { Compass, MapPin, Gauge, Layers } from "lucide-react";

export default function WellMetadata({ well }) {
  if (!well) return null;

  return (
    <div className="metric-grid">
      <div className="metric-card accent-amber">
        <div className="metric-header">
          <span className="metric-label">TOTAL DEPTH</span>
          <Gauge size={16} className="text-muted" />
        </div>
        <div className="metric-value font-mono">
          {well.total_depth !== null && well.total_depth !== undefined
            ? `${well.total_depth.toLocaleString()} m`
            : "—"}
        </div>
        <div className="metric-sub">True Vertical Depth</div>
      </div>

      <div className="metric-card accent-blue">
        <div className="metric-header">
          <span className="metric-label">WELL TYPE</span>
          <Layers size={16} className="text-muted" />
        </div>
        <div className="metric-value" style={{ fontSize: 20 }}>
          {well.well_type ?? "Exploration"}
        </div>
        <div className="metric-sub">Classification</div>
      </div>

      <div className="metric-card accent-green">
        <div className="metric-header">
          <span className="metric-label">STATUS</span>
          <Compass size={16} className="text-muted" />
        </div>
        <div style={{ margin: "6px 0" }}>
          <StatusBadge status={well.status} />
        </div>
        <div className="metric-sub">Operational state</div>
      </div>

      <div className="metric-card">
        <div className="metric-header">
          <span className="metric-label">COORDINATES (WGS84)</span>
          <MapPin size={16} className="text-muted" />
        </div>
        <div
          className="metric-value font-mono"
          style={{ fontSize: 14, marginTop: 4, letterSpacing: 0 }}
        >
          {well.latitude ? well.latitude.toFixed(5) : "—"}° N,{" "}
          {well.longitude ? well.longitude.toFixed(5) : "—"}° E
        </div>
        <div className="metric-sub">SRID 4326 PostGIS Point</div>
      </div>
    </div>
  );
}
