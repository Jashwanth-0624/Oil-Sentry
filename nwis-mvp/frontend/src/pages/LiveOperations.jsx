import React, { useState, useEffect, useMemo } from "react";
import PageHeader from "../components/layout/PageHeader";
import TelemetryCard from "../components/operations/TelemetryCard";
import TelemetryChart from "../components/operations/TelemetryChart";
import LiveRiskMonitor from "../components/operations/LiveRiskMonitor";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import StatusBadge from "../components/common/StatusBadge";
import { useLiveTelemetry } from "../hooks/useLiveTelemetry";
import { getWells, getAlerts, acknowledgeAlert } from "../services/api";
import {
  Radio,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Activity,
  Layers,
  Cpu,
  Clock,
  Gauge,
  CheckCircle,
  AlertCircle,
  BellRing,
  Check,
  X,
  ShieldAlert,
  FileText,
} from "lucide-react";


const SCENARIOS = [
  { id: "automatic", label: "Automatic Hazard Cycle (Recommended)" },
  { id: "normal", label: "Baseline Normal Drilling" },
  { id: "high_torque", label: "Simulated High Torque Event" },
  { id: "mud_loss", label: "Simulated Mud Loss Event" },
  { id: "stuck_pipe", label: "Simulated Stuck Pipe Event" },
];

export default function LiveOperations() {
  const [wells, setWells] = useState([]);
  const [selectedWellId, setSelectedWellId] = useState("W001");
  const [wellsLoading, setWellsLoading] = useState(true);

  // Load well catalog for well selector
  useEffect(() => {
    async function loadCatalog() {
      try {
        setWellsLoading(true);
        const list = await getWells();
        setWells(list || []);
      } catch (err) {
        console.error("Could not load well catalog:", err);
      } finally {
        setWellsLoading(false);
      }
    }
    loadCatalog();
  }, []);

  // Live WebSocket hook
  const {
    connectionState,
    currentTelemetry,
    telemetryHistory,
    riskHistory,
    isStreaming,
    activeScenario,
    activeAlert,
    alertHistory,
    dismissActiveAlert,
    error: wsError,
    startStream,
    pauseStream,
    changeWell,
    changeScenario,
    reconnect,
  } = useLiveTelemetry({
    initialWellId: selectedWellId,
    initialScenario: "automatic",
    maxHistory: 60,
    autoConnect: true,
  });

  // Persistent operational alerts for the active well
  const [dbAlerts, setDbAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  useEffect(() => {
    async function fetchWellAlerts() {
      try {
        setAlertsLoading(true);
        const res = await getAlerts({ well_id: selectedWellId, limit: 15 });
        setDbAlerts(res.alerts || []);
      } catch (err) {
        console.warn("Could not fetch database alerts for well:", err);
      } finally {
        setAlertsLoading(false);
      }
    }
    fetchWellAlerts();
  }, [selectedWellId]);

  const handleAcknowledge = async (alertId) => {
    try {
      await acknowledgeAlert(alertId);
      setDbAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: "ACKNOWLEDGED" } : a))
      );
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    }
  };

  // Merge real-time WS alert events with persistent DB alerts
  const combinedAlerts = useMemo(() => {
    const map = new Map();
    dbAlerts.forEach((a) => map.set(a.id, a));
    alertHistory.forEach((a) => {
      if (a.alert_id) {
        const existing = map.get(a.alert_id);
        map.set(a.alert_id, {
          id: a.alert_id,
          well_id: a.well_id,
          event_type: a.event_type,
          severity: a.severity,
          probability: a.probability,
          depth: a.depth,
          status: a.status,
          source: a.source || "SIMULATION",
          created_at: a.timestamp,
          recovery_time: a.status === "RECOVERED" ? a.timestamp : existing?.recovery_time,
          description: a.message,
        });
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );
  }, [dbAlerts, alertHistory]);

  const handleWellChange = (newWellId) => {
    setSelectedWellId(newWellId);
    changeWell(newWellId);
  };

  const handleScenarioChange = (newScenario) => {
    changeScenario(newScenario);
  };

  const isLive = connectionState === "LIVE" && isStreaming;
  const isConnecting = connectionState === "CONNECTING" || connectionState === "RECONNECTING";
  const currentRisk = currentTelemetry?.risk?.label || "NORMAL";
  const riskProbability = currentTelemetry?.risk?.probability || 0.95;
  const probabilities = currentTelemetry?.risk?.probabilities || {

    NORMAL: 0.95,
    STUCK_PIPE: 0.02,
    MUD_LOSS: 0.01,
    HIGH_TORQUE: 0.02,
  };

  return (
    <div>
      <PageHeader
        title="Live Drilling Operations"
        subtitle="Real-time telemetry streaming and live XGBoost risk monitoring"
        badge={
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 10px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: isLive
                ? "var(--status-normal-bg)"
                : isConnecting
                ? "var(--status-loss-bg)"
                : "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${
                isLive
                  ? "var(--status-normal-border)"
                  : isConnecting
                  ? "var(--status-loss-border)"
                  : "var(--border-subtle)"
              }`,
              marginLeft: 12,
            }}
          >
            <span className={`status-dot ${isLive ? "" : isConnecting ? "warning" : "offline"}`} />
            <span
              className="font-mono"
              style={{
                fontSize: 11,
                color: isLive
                  ? "var(--status-normal)"
                  : isConnecting
                  ? "var(--accent-amber)"
                  : "var(--text-muted)",
                fontWeight: 700,
                letterSpacing: "0.06em",
              }}
            >
              {isLive
                ? "LIVE STREAMING · 1 Hz"
                : isConnecting
                ? `${connectionState}...`
                : isStreaming
                ? "STREAM ACTIVE"
                : "STREAM PAUSED"}
            </span>
          </div>
        }
      />

      {/* Synthetic Simulation Disclaimer Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          backgroundColor: "var(--bg-panel)",
          border: "1px solid var(--border-subtle)",
          borderLeft: "3px solid var(--accent-amber)",
          borderRadius: "var(--radius-sm)",
          marginBottom: "16px",
        }}
      >
        <Radio size={16} style={{ color: "var(--accent-amber)", flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          <strong style={{ color: "var(--accent-amber)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Simulated Live Telemetry:
          </strong>{" "}
          Demonstrating 1 Hz streaming architecture and real-time XGBoost hazard inference across sequential drilling dynamics.
          Calibrated benchmark simulation, not actual Oil India production SCADA.
        </div>
      </div>

      {/* Live Operational Alert Banner (Step 8) */}
      {activeAlert && activeAlert.status === "ACTIVE" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            padding: "16px 20px",
            backgroundColor:
              activeAlert.severity === "CRITICAL"
                ? "rgba(239, 68, 68, 0.12)"
                : "rgba(212, 151, 59, 0.12)",
            border: `1px solid ${
              activeAlert.severity === "CRITICAL"
                ? "rgba(239, 68, 68, 0.45)"
                : "rgba(212, 151, 59, 0.45)"
            }`,
            borderLeft: `4px solid ${
              activeAlert.severity === "CRITICAL" ? "#ef4444" : "var(--accent-amber)"
            }`,
            borderRadius: "var(--radius-sm)",
            marginBottom: 16,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <BellRing
                size={22}
                style={{
                  color:
                    activeAlert.severity === "CRITICAL" ? "#ef4444" : "var(--accent-amber)",
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color:
                        activeAlert.severity === "CRITICAL"
                          ? "#ef4444"
                          : "var(--accent-amber)",
                    }}
                  >
                    MODEL-GENERATED SIMULATED ALERT
                  </span>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "var(--text-secondary)",
                      fontSize: 10,
                    }}
                  >
                    {activeAlert.source || "SIMULATION"}
                  </span>
                  <StatusBadge status={activeAlert.severity} />
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#ffffff",
                    marginTop: 2,
                  }}
                >
                  {activeAlert.event_type} PREDICTED RISK CONDITION
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Probability
                </div>
                <div
                  className="font-mono"
                  style={{ fontSize: 16, fontWeight: 700, color: "var(--accent-amber)" }}
                >
                  {Math.round((activeAlert.probability || 0) * 100)}%
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Depth
                </div>
                <div
                  className="font-mono"
                  style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}
                >
                  {activeAlert.depth != null ? `${Number(activeAlert.depth).toFixed(1)} m` : "—"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Target Well
                </div>
                <div
                  className="font-mono"
                  style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}
                >
                  {activeAlert.well_id}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleAcknowledge(activeAlert.alert_id)}
                className="button button-outline"
                style={{ fontSize: 11, padding: "5px 12px" }}
              >
                <Check size={12} /> Acknowledge
              </button>
              <button
                type="button"
                onClick={dismissActiveAlert}
                className="button button-ghost"
                style={{ padding: "4px 6px", color: "var(--text-muted)" }}
                title="Dismiss Alert Banner"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
              borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: 8,
            }}
          >
            {activeAlert.message ||
              "Predicted risk condition based on synthetic telemetry. Alert triggered after sustained frames >= threshold."}
          </div>
        </div>
      )}

      {/* Alert Recovery Banner (Step 8) */}
      {activeAlert && activeAlert.status === "RECOVERED" && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 18px",
            backgroundColor: "rgba(34, 197, 94, 0.08)",
            border: "1px solid rgba(34, 197, 94, 0.25)",
            borderLeft: "4px solid #22c55e",
            borderRadius: "var(--radius-sm)",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CheckCircle size={18} style={{ color: "#22c55e", flexShrink: 0 }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#22c55e",
                    textTransform: "uppercase",
                  }}
                >
                  ALERT RECOVERED
                </span>
                <span className="badge badge-normal" style={{ fontSize: 10 }}>
                  RECOVERED
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-primary)" }}>
                Simulated <strong>{activeAlert.event_type}</strong> condition on {activeAlert.well_id} has recovered below risk threshold.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissActiveAlert}
            className="button button-ghost"
            style={{ fontSize: 11, padding: "4px 8px", color: "var(--text-muted)" }}
          >
            <X size={13} /> Dismiss
          </button>
        </div>
      )}

      {/* Stream Controls Toolbar */}

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
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
          {/* Target Well Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              TARGET WELL:
            </span>
            <select
              value={selectedWellId}
              onChange={(e) => handleWellChange(e.target.value)}
              className="select font-mono"
              style={{ minWidth: 140, fontSize: 12 }}
            >
              {wells.length === 0 ? (
                <option value="W001">W001 — Loading...</option>
              ) : (
                wells.map((w) => (
                  <option key={w.well_id} value={w.well_id}>
                    {w.well_id} — {w.field}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Scenario Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              SIMULATION SCENARIO:
            </span>
            <select
              value={activeScenario}
              onChange={(e) => handleScenarioChange(e.target.value)}
              className="select font-mono"
              style={{ minWidth: 220, fontSize: 12 }}
            >
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons: Pause/Start & Reconnect */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isStreaming ? (
            <button
              type="button"
              className="button button-secondary"
              onClick={pauseStream}
              style={{ fontSize: 12, padding: "7px 14px" }}
            >
              <Pause size={13} />
              <span>Pause Stream</span>
            </button>
          ) : (
            <button
              type="button"
              className="button button-primary"
              onClick={() => startStream(selectedWellId, activeScenario)}
              style={{ fontSize: 12, padding: "7px 14px" }}
            >
              <Play size={13} />
              <span>Start Stream</span>
            </button>
          )}

          {connectionState !== "LIVE" && (
            <button
              type="button"
              className="button button-ghost"
              onClick={reconnect}
              style={{ fontSize: 12, padding: "7px 12px", color: "var(--accent-amber)" }}
              title="Reconnect to WebSocket server"
            >
              <RefreshCw size={13} />
              <span>Reconnect</span>
            </button>
          )}
        </div>
      </div>

      {/* Sensor Channel Strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          padding: "8px 16px",
          backgroundColor: "var(--bg-panel)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border-subtle)",
          marginBottom: 16,
          fontSize: 11,
          fontFamily: "var(--font-mono)",
        }}
      >
        <span style={{ color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
          TELEMETRY CHANNELS:
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {["DEPTH", "ROP", "WOB", "RPM", "TORQUE", "SPP", "MUD DENSITY"].map((ch) => (
            <span key={ch} style={{ display: "flex", alignItems: "center", gap: 5, color: isLive ? "var(--text-primary)" : "var(--text-muted)" }}>
              <span className={`status-dot ${isLive ? "" : "offline"}`} style={{ width: 6, height: 6 }} />
              <span>{ch}</span>
            </span>
          ))}
        </div>
        <span style={{ color: isLive ? "var(--status-normal)" : "var(--text-muted)" }}>
          {isLive ? "1.0 Hz (Synchronized)" : "Offline"}
        </span>
      </div>

      {/* Primary Telemetry Cards (7 Channels) */}
      <div className="metric-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginBottom: 20 }}>
        <TelemetryCard
          label="DEPTH"
          value={currentTelemetry?.depth != null ? currentTelemetry.depth.toFixed(1) : "—"}
          unit="m"
          min="0"
          max={4500}
        />

        <TelemetryCard
          label="ROP"
          value={currentTelemetry?.rop != null ? currentTelemetry.rop.toFixed(1) : "—"}
          unit="m/hr"
          min="0"
          max="45.0"
        />

        <TelemetryCard
          label="WOB"
          value={currentTelemetry?.wob != null ? currentTelemetry.wob.toFixed(1) : "—"}
          unit="kN"
          min="0"
          max="35.0"
        />

        <TelemetryCard
          label="RPM"
          value={currentTelemetry?.rpm != null ? currentTelemetry.rpm.toFixed(0) : "—"}
          unit="RPM"
          min="0"
          max="180"
        />

        <TelemetryCard
          label="TORQUE"
          value={currentTelemetry?.torque != null ? currentTelemetry.torque.toFixed(1) : "—"}
          unit="kN·m"
          min="0"
          max="65"
          status={currentTelemetry?.torque > 30 ? "torque" : "normal"}
        />

        <TelemetryCard
          label="STANDPIPE PRESSURE"
          value={
            currentTelemetry?.standpipe_pressure != null
              ? currentTelemetry.standpipe_pressure.toFixed(0)
              : "—"
          }
          unit="psi"
          min="500"
          max="3800"
          status={
            currentTelemetry?.standpipe_pressure < 1600
              ? "loss"
              : currentTelemetry?.standpipe_pressure > 3100
              ? "stuck"
              : "normal"
          }
        />

        <TelemetryCard
          label="MUD DENSITY"
          value={
            currentTelemetry?.mud_density != null
              ? currentTelemetry.mud_density.toFixed(3)
              : "—"
          }
          unit="g/cm³"
          min="1.00"
          max="1.50"
        />
      </div>

      {/* Main Split Grid: Charts (Left) & Risk Monitor + Prediction Log (Right) */}
      <div className="grid-split-2-1">
        {/* Left: Telemetry Dynamics Line Chart */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Activity size={16} />
              <span>Drilling Dynamics Telemetry (Recent {telemetryHistory.length} Frames)</span>
            </div>
            <span className="badge badge-neutral font-mono">
              Window: {telemetryHistory.length}s
            </span>
          </div>
          <div className="panel-body">
            <TelemetryChart data={telemetryHistory} />
          </div>
        </div>

        {/* Right: Real-Time Risk Monitor & Risk Event Log */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <LiveRiskMonitor
            currentRisk={currentRisk}
            probability={riskProbability}
            probabilities={probabilities}
            isOnline={isLive}
            scenario={activeScenario}
          />

          {/* Recent Model Predictions Log */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <Clock size={15} />
                <span>Prediction Stream History</span>
              </div>
              <span className="badge badge-neutral font-mono" style={{ fontSize: 10 }}>
                {riskHistory.length} records
              </span>
            </div>

            <div className="panel-body" style={{ maxHeight: 260, overflowY: "auto", padding: 0 }}>
              {riskHistory.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {riskHistory.slice(0, 10).map((item, idx) => {
                    const timeStr = item.timestamp
                      ? new Date(item.timestamp).toLocaleTimeString()
                      : "—";
                    const isHazard = item.label !== "NORMAL";

                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 14px",
                          borderBottom: "1px solid var(--border-subtle)",
                          backgroundColor: isHazard ? "rgba(212, 151, 59, 0.05)" : "transparent",
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="font-mono" style={{ color: "var(--text-muted)", fontSize: 11 }}>
                            {timeStr}
                          </span>
                          <span className="font-mono" style={{ color: "var(--text-secondary)", fontSize: 11 }}>
                            {item.depth?.toFixed(1)}m
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <StatusBadge status={item.label} />
                          <span
                            className="font-mono"
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: isHazard ? "var(--accent-amber)" : "var(--status-normal)",
                            }}
                          >
                            {Math.round((item.probability || 0) * 100)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                  Awaiting real-time prediction frames from XGBoost model...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Operational Alert History Section (Step 9) */}
      <div className="panel" style={{ marginTop: 20 }}>
        <div className="panel-header">
          <div className="panel-title">
            <ShieldAlert size={16} />
            <span>Simulated Operational Alert Log ({selectedWellId})</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="badge badge-neutral font-mono" style={{ fontSize: 11 }}>
              {combinedAlerts.length} Recorded Alerts
            </span>
            <span
              className="font-mono"
              style={{ fontSize: 11, color: "var(--text-muted)" }}
            >
              Source: SIMULATION
            </span>
          </div>
        </div>

        <div className="panel-body" style={{ padding: 0 }}>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Well</th>
                  <th>Hazard Event</th>
                  <th>Severity</th>
                  <th>Probability</th>
                  <th>Depth</th>
                  <th>Status</th>
                  <th>Description</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {combinedAlerts.map((item, idx) => {
                  const timeStr = item.created_at
                    ? new Date(item.created_at).toLocaleString()
                    : "—";
                  const probStr =
                    item.probability != null
                      ? `${Math.round(item.probability * 100)}%`
                      : "—";

                  return (
                    <tr key={item.id || idx}>
                      <td className="font-mono" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                        {timeStr}
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                        {item.well_id}
                      </td>
                      <td>
                        <StatusBadge status={item.event_type} />
                      </td>
                      <td>
                        <StatusBadge status={item.severity} />
                      </td>
                      <td className="font-mono" style={{ fontWeight: 700, color: "var(--accent-amber)" }}>
                        {probStr}
                      </td>
                      <td className="font-mono">
                        {item.depth != null ? `${Number(item.depth).toFixed(1)} m` : "—"}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            item.status === "ACTIVE"
                              ? "badge-danger"
                              : item.status === "RECOVERED"
                              ? "badge-normal"
                              : "badge-secondary"
                          }`}
                          style={{ fontSize: 10 }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 300, whiteSpace: "normal" }}>
                        {item.description || "Model-generated simulated alert condition."}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {item.status === "ACTIVE" && item.id && (
                          <button
                            type="button"
                            onClick={() => handleAcknowledge(item.id)}
                            className="button button-outline"
                            style={{ padding: "3px 8px", fontSize: 11 }}
                          >
                            <Check size={11} /> Ack
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {combinedAlerts.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}
                    >
                      No operational alerts recorded for well {selectedWellId}. Normal drilling baseline maintained.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
