import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import StatusBadge from "../common/StatusBadge";
import { ArrowRight, Search, Filter } from "lucide-react";

export default function WellTable({ wells = [] }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [fieldFilter, setFieldFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Extract distinct filter values
  const fields = useMemo(() => {
    const set = new Set(wells.map((w) => w.field).filter(Boolean));
    return ["ALL", ...Array.from(set)];
  }, [wells]);

  const statuses = useMemo(() => {
    const set = new Set(wells.map((w) => w.status).filter(Boolean));
    return ["ALL", ...Array.from(set)];
  }, [wells]);

  const types = useMemo(() => {
    const set = new Set(wells.map((w) => w.well_type).filter(Boolean));
    return ["ALL", ...Array.from(set)];
  }, [wells]);

  // Filtered dataset
  const filteredWells = useMemo(() => {
    return wells.filter((w) => {
      const matchSearch =
        searchTerm === "" ||
        w.well_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.field && w.field.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchField = fieldFilter === "ALL" || w.field === fieldFilter;
      const matchStatus = statusFilter === "ALL" || w.status === statusFilter;
      const matchType = typeFilter === "ALL" || w.well_type === typeFilter;

      return matchSearch && matchField && matchStatus && matchType;
    });
  }, [wells, searchTerm, fieldFilter, statusFilter, typeFilter]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: 12,
              top: 11,
              color: "var(--text-muted)",
            }}
          />
          <input
            type="text"
            placeholder="Search Well ID or Field..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input"
            style={{ width: "100%", paddingLeft: "36px" }}
          />
        </div>

        <select
          value={fieldFilter}
          onChange={(e) => setFieldFilter(e.target.value)}
          className="select"
        >
          {fields.map((f) => (
            <option key={f} value={f}>
              Field: {f}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="select"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              Status: {s}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="select"
        >
          {types.map((t) => (
            <option key={t} value={t}>
              Type: {t}
            </option>
          ))}
        </select>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Well</th>
              <th>Field</th>
              <th>Type</th>
              <th>Status</th>
              <th>Depth</th>
              <th>Location</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredWells.map((well) => (
              <tr key={well.well_id}>
                <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  {well.well_id}
                </td>
                <td>{well.field ?? "—"}</td>
                <td>{well.well_type ?? "—"}</td>
                <td>
                  <StatusBadge status={well.status} />
                </td>
                <td className="font-mono">
                  {well.total_depth !== null && well.total_depth !== undefined
                    ? `${well.total_depth.toLocaleString()} m`
                    : "—"}
                </td>
                <td className="font-mono" style={{ color: "var(--text-muted)" }}>
                  {well.latitude && well.longitude
                    ? `${well.latitude.toFixed(4)}°N, ${well.longitude.toFixed(4)}°E`
                    : "—"}
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    onClick={() => navigate(`/app/wells/${well.well_id}`)}
                    className="button button-outline"
                    style={{ padding: "4px 10px", fontSize: 11 }}
                  >
                    View Dossier <ArrowRight size={12} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredWells.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                  No wells found matching the selected search and filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
