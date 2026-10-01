import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import StatusBadge from "../common/StatusBadge";
import { Search, ArrowRight, Filter } from "lucide-react";

export default function EventTable({
  events = [],
  showFilters = true,
  showWellColumn = true,
}) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [wellFilter, setWellFilter] = useState("ALL");
  const [fieldFilter, setFieldFilter] = useState("ALL");
  const [eventFilter, setEventFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [formationFilter, setFormationFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const wellsList = useMemo(() => {
    const set = new Set(events.map((e) => e.well_id).filter(Boolean));
    return ["ALL", ...Array.from(set).sort()];
  }, [events]);

  const fieldsList = useMemo(() => {
    const set = new Set(events.map((e) => e.field).filter(Boolean));
    return ["ALL", ...Array.from(set).sort()];
  }, [events]);

  const eventList = useMemo(() => {
    const set = new Set(events.map((e) => e.event_type).filter(Boolean));
    return ["ALL", ...Array.from(set).sort()];
  }, [events]);

  const severityList = useMemo(() => {
    return ["ALL", "CRITICAL", "HIGH", "WARNING", "NORMAL"];
  }, []);

  const formationList = useMemo(() => {
    const set = new Set(events.map((e) => e.formation).filter(Boolean));
    return ["ALL", ...Array.from(set).sort()];
  }, [events]);

  const sourceList = useMemo(() => {
    return ["ALL", "HISTORICAL", "LIVE SIMULATION"];
  }, []);

  const statusList = useMemo(() => {
    const set = new Set(events.map((e) => e.status).filter(Boolean));
    return ["ALL", ...Array.from(set).sort()];
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchSearch =
        searchTerm === "" ||
        (e.formation && e.formation.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.cause && e.cause.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.mitigation && e.mitigation.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.outcome && e.outcome.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchWell = wellFilter === "ALL" || e.well_id === wellFilter;
      const matchField = fieldFilter === "ALL" || e.field === fieldFilter;
      const matchEvent = eventFilter === "ALL" || e.event_type === eventFilter;
      const matchFormation = formationFilter === "ALL" || e.formation === formationFilter;

      const matchSource =
        sourceFilter === "ALL" ||
        (e.source && e.source.toUpperCase() === sourceFilter.toUpperCase());

      const matchStatus =
        statusFilter === "ALL" ||
        (e.status && e.status.toUpperCase() === statusFilter.toUpperCase());

      const matchSeverity =
        severityFilter === "ALL" ||
        (e.severity && e.severity.toUpperCase() === severityFilter.toUpperCase()) ||
        (severityFilter === "HIGH" && e.severity?.toUpperCase() === "CRITICAL") ||
        (severityFilter === "WARNING" && e.severity?.toUpperCase() === "MEDIUM");

      return (
        matchSearch &&
        matchWell &&
        matchField &&
        matchEvent &&
        matchSeverity &&
        matchFormation &&
        matchSource &&
        matchStatus
      );
    });
  }, [
    events,
    searchTerm,
    wellFilter,
    fieldFilter,
    eventFilter,
    severityFilter,
    formationFilter,
    sourceFilter,
    statusFilter,
  ]);

  return (
    <div>
      {showFilters && (
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "18px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative", flex: "1 1 200px" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: 10,
                top: 10,
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              placeholder="Search cause, mitigation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              style={{ width: "100%", paddingLeft: "32px" }}
            />
          </div>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="select"
          >
            {sourceList.map((s) => (
              <option key={s} value={s}>
                Source: {s}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select"
          >
            {statusList.map((st) => (
              <option key={st} value={st}>
                Status: {st}
              </option>
            ))}
          </select>

          {showWellColumn && (
            <select
              value={wellFilter}
              onChange={(e) => setWellFilter(e.target.value)}
              className="select"
            >
              {wellsList.map((w) => (
                <option key={w} value={w}>
                  Well: {w}
                </option>
              ))}
            </select>
          )}

          <select
            value={fieldFilter}
            onChange={(e) => setFieldFilter(e.target.value)}
            className="select"
          >
            {fieldsList.map((f) => (
              <option key={f} value={f}>
                Field: {f}
              </option>
            ))}
          </select>

          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="select"
          >
            {eventList.map((t) => (
              <option key={t} value={t}>
                Event: {t}
              </option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="select"
          >
            {severityList.map((s) => (
              <option key={s} value={s}>
                Severity: {s}
              </option>
            ))}
          </select>

          <select
            value={formationFilter}
            onChange={(e) => setFormationFilter(e.target.value)}
            className="select"
          >
            {formationList.map((f) => (
              <option key={f} value={f}>
                Formation: {f}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              {showWellColumn && <th>Well</th>}
              <th>Source</th>
              <th>Status</th>
              <th>Depth</th>
              <th>Formation</th>
              <th>Event</th>
              <th>Severity</th>
              <th style={{ minWidth: 180 }}>Cause / Description</th>
              <th style={{ minWidth: 180 }}>Mitigation</th>
              <th style={{ minWidth: 150 }}>Outcome</th>
              {showWellColumn && <th style={{ textAlign: "right" }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((item, idx) => (
              <tr key={item.id || idx}>
                {showWellColumn && (
                  <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                    {item.well_id}
                  </td>
                )}
                <td>
                  {item.source === "LIVE SIMULATION" ? (
                    <span
                      className="badge"
                      style={{
                        backgroundColor: "rgba(212, 151, 59, 0.15)",
                        color: "var(--accent-amber)",
                        border: "1px solid rgba(212, 151, 59, 0.3)",
                        fontSize: 10,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      SIMULATION
                    </span>
                  ) : (
                    <span
                      className="badge badge-neutral"
                      style={{ fontSize: 10, whiteSpace: "nowrap" }}
                    >
                      HISTORICAL
                    </span>
                  )}
                </td>
                <td>
                  <span
                    className={`badge ${
                      item.status === "ACTIVE"
                        ? "badge-danger"
                        : item.status === "RECOVERED"
                        ? "badge-normal"
                        : item.status === "ACKNOWLEDGED"
                        ? "badge-secondary"
                        : "badge-neutral"
                    }`}
                    style={{ fontSize: 10 }}
                  >
                    {item.status || "HISTORICAL"}
                  </span>
                </td>
                <td className="font-mono">
                  {item.depth !== null && item.depth !== undefined
                    ? `${Number(item.depth).toLocaleString()} m`
                    : "—"}
                </td>
                <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                  {item.formation || "—"}
                </td>
                <td>
                  <StatusBadge status={item.event_type} />
                </td>
                <td>
                  <StatusBadge status={item.severity} />
                </td>
                <td style={{ whiteSpace: "normal", fontSize: 12 }}>
                  {item.cause || item.description || "—"}
                </td>
                <td style={{ whiteSpace: "normal", fontSize: 12 }}>
                  {item.mitigation || "—"}
                </td>
                <td style={{ whiteSpace: "normal", fontSize: 12 }}>
                  {item.outcome || "—"}
                </td>
                {showWellColumn && (
                  <td style={{ textAlign: "right" }}>
                    {item.well_id && (
                      <button
                        type="button"
                        onClick={() => navigate(`/app/wells/${item.well_id}`)}
                        className="button button-outline"
                        style={{ padding: "3px 8px", fontSize: 11 }}
                      >
                        Well <ArrowRight size={11} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {filteredEvents.length === 0 && (
              <tr>
                <td
                  colSpan={showWellColumn ? 11 : 10}
                  style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}
                >
                  No events found matching the specified filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

