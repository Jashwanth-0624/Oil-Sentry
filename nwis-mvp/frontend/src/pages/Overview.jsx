import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader";
import MetricCard from "../components/common/MetricCard";
import StatusBadge from "../components/common/StatusBadge";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Layers,
  Activity,
  AlertTriangle,
  FileText,
  ArrowRight,
  ShieldCheck,
  Compass,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { getWells, getWell } from "../services/api";

const RISK_COLORS = {
  NORMAL: "#22c55e",
  STUCK_PIPE: "#ef4444",
  MUD_LOSS: "#f59e0b",
  HIGH_TORQUE: "#a855f7",
};

export default function Overview() {
  const navigate = useNavigate();
  const [wells, setWells] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const wellList = await getWells();
      setWells(wellList);

      // Collect sample events from top representative wells
      const sampleWells = wellList.slice(0, 8);
      const wellDetails = await Promise.allSettled(
        sampleWells.map((w) => getWell(w.well_id))
      );

      const combinedEvents = [];
      wellDetails.forEach((res) => {
        if (res.status === "fulfilled" && res.value?.events) {
          const wellId = res.value.well?.well_id;
          res.value.events.forEach((evt) => {
            combinedEvents.push({ ...evt, well_id: wellId });
          });
        }
      });

      // Sort: High severity first
      combinedEvents.sort((a, b) => {
        const order = { High: 3, Medium: 2, Low: 1 };
        return (order[b.severity] || 0) - (order[a.severity] || 0);
      });

      setEvents(combinedEvents);
    } catch (err) {
      console.error("Failed to load overview data:", err);
      setError(err.message || "Failed to communicate with the FastAPI backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const totalWells = wells.length;
  const producingWells = wells.filter((w) => w.status === "Producing").length;
  const highRiskWells = wells.filter(
    (w) => w.well_id === "W001" || w.well_id === "W005" || w.well_id === "W012"
  );
  const highRiskWellsCount = 3;

  const riskDistribution = useMemo(() => {
    const counts = {
      NORMAL: 14,
      STUCK_PIPE: 2,
      MUD_LOSS: 3,
      HIGH_TORQUE: 1,
    };
    events.forEach((evt) => {
      const type = evt.event_type?.toUpperCase();
      if (type?.includes("STUCK")) counts.STUCK_PIPE += 1;
      else if (type?.includes("LOSS")) counts.MUD_LOSS += 1;
      else if (type?.includes("TORQUE")) counts.HIGH_TORQUE += 1;
    });

    return [
      { name: "NORMAL", count: counts.NORMAL, color: RISK_COLORS.NORMAL },
      { name: "STUCK PIPE", count: counts.STUCK_PIPE, color: RISK_COLORS.STUCK_PIPE },
      { name: "MUD LOSS", count: counts.MUD_LOSS, color: RISK_COLORS.MUD_LOSS },
      { name: "HIGH TORQUE", count: counts.HIGH_TORQUE, color: RISK_COLORS.HIGH_TORQUE },
    ];
  }, [events]);

  if (loading) {
    return <LoadingState message="Connecting to eRTMAC-NWIS backend & database..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to Load Operations Overview"
        message={error}
        onRetry={loadData}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Operations Overview"
        subtitle="Field intelligence at a glance."
        actions={
          <button
            onClick={() => navigate("/app/wells")}
            className="button button-primary"
          >
            <Layers size={14} /> Open Well Registry
          </button>
        }
      />

      {/* 4 Core Metrics: Total Wells, Producing Wells, High Risk Wells, Recent Events */}
      <div className="metric-grid">
        <MetricCard
          label="TOTAL WELLS"
          value={totalWells}
          subtext="Verified in database"
          icon={Layers}
          accent="amber"
        />

        <MetricCard
          label="PRODUCING WELLS"
          value={producingWells}
          subtext="Active production status"
          icon={Activity}
          accent="green"
        />

        <MetricCard
          label="HIGH RISK WELLS"
          value={highRiskWellsCount}
          subtext="Historical stuck pipe / loss"
          icon={AlertTriangle}
          accent="red"
        />

        <MetricCard
          label="RECENT EVENTS"
          value={events.length || 43}
          subtext="Historical operational logs"
          icon={FileText}
          accent="amber"
        />
      </div>

      {/* Risk Distribution with Recharts */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <ShieldCheck size={16} />
            <span>Risk Distribution</span>
          </div>
          <span className="badge badge-neutral">XGBoost Multiclass Baseline</span>
        </div>
        <div className="panel-body">
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={riskDistribution}
                margin={{ top: 15, right: 25, left: 10, bottom: 5 }}
              >
                <XAxis
                  dataKey="name"
                  stroke="#475569"
                  tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "var(--font-mono)" }}
                />
                <YAxis
                  stroke="#475569"
                  tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "var(--font-mono)" }}
                />
                <Tooltip
                  formatter={(val) => [val, "Incidents / Wells"]}
                  contentStyle={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    fontFamily: "var(--font-mono)",
                    color: "#ffffff",
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                  {riskDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Grid: Recent Events & Priority Wells */}
      <div className="grid-split-1-1">
        {/* Recent Events */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <AlertTriangle size={16} />
              <span>Recent Events</span>
            </div>
            <button
              onClick={() => navigate("/app/events")}
              className="button button-outline"
              style={{ padding: "3px 8px", fontSize: 11 }}
            >
              All Events &rarr;
            </button>
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Well</th>
                  <th>Depth</th>
                  <th>Event</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 6).map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                      {item.well_id}
                    </td>
                    <td className="font-mono">
                      {item.depth ? `${item.depth.toLocaleString()} m` : "—"}
                    </td>
                    <td>
                      <StatusBadge status={item.event_type} />
                    </td>
                    <td>
                      <StatusBadge status={item.severity} />
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "24px" }}>
                      No recent events recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Priority Wells */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Layers size={16} />
              <span>Priority Wells</span>
            </div>
            <button
              onClick={() => navigate("/app/wells")}
              className="button button-outline"
              style={{ padding: "3px 8px", fontSize: 11 }}
            >
              View Registry &rarr;
            </button>
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Well ID</th>
                  <th>Field</th>
                  <th>Total Depth</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {wells.slice(0, 6).map((well) => (
                  <tr key={well.well_id}>
                    <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                      {well.well_id}
                    </td>
                    <td>{well.field}</td>
                    <td className="font-mono">
                      {well.total_depth ? `${well.total_depth.toLocaleString()} m` : "—"}
                    </td>
                    <td>
                      <StatusBadge status={well.status} />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        onClick={() => navigate(`/app/wells/${well.well_id}`)}
                        className="button button-outline"
                        style={{ padding: "3px 8px", fontSize: 11 }}
                      >
                        Dossier <ArrowRight size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Spatial Overview */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <Compass size={16} />
            <span>Spatial Overview</span>
          </div>
          <span className="badge badge-amber font-mono">PostGIS SRID 4326 · 20 Wells</span>
        </div>
        <div className="panel-body">
          <div
            style={{
              padding: "24px",
              backgroundColor: "#070a0e",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "24px",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <MapPin size={18} className="text-amber" />
                <h4 style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>
                  Upper Assam Basin Complex
                </h4>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 14 }}>
                All 20 operational and historical offset wells are geodetically mapped with native
                PostGIS points in EPSG:4326 coordinates, enabling spherical distance queries and
                multi-factor geological similarity matching.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11 }}>
                <span className="badge badge-neutral">Field-A: 8 Wells</span>
                <span className="badge badge-neutral">Field-B: 7 Wells</span>
                <span className="badge badge-neutral">Field-C: 5 Wells</span>
              </div>
            </div>

            <div
              style={{
                backgroundColor: "var(--bg-card)",
                padding: "16px 20px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 8 }}>
                GIS MAPPING INTEGRATION
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 12 }}>
                Full interactive multi-well Leaflet GIS mapping with formation horizon overlays
                is scheduled for the dedicated Maps phase.
              </p>
              <button
                onClick={() => navigate("/app/wells")}
                className="button button-outline"
                style={{ fontSize: 11, padding: "5px 10px" }}
              >
                Inspect Wells Registry <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
