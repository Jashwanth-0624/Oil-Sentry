import React from "react";

export default function TelemetryCard({
  label,
  value,
  unit,
  min,
  max,
  status = "normal",
  trend,
}) {
  return (
    <div
      className="metric-card"
      style={{
        borderTop: `3px solid ${
          status === "stuck"
            ? "var(--status-stuck)"
            : status === "loss"
            ? "var(--status-loss)"
            : status === "torque"
            ? "var(--status-torque)"
            : "var(--accent-amber)"
        }`,
      }}
    >
      <div className="metric-header">
        <span className="metric-label">{label}</span>
        {unit && (
          <span
            className="font-mono"
            style={{ fontSize: 11, color: "var(--text-muted)" }}
          >
            {unit}
          </span>
        )}
      </div>

      <div
        className="metric-value font-mono"
        style={{ fontSize: 28, margin: "8px 0 4px" }}
      >
        {value !== undefined && value !== null ? value : "—"}
      </div>

      {(min !== undefined || max !== undefined) && (
        <div
          className="metric-sub font-mono"
          style={{ justifyContent: "space-between" }}
        >
          <span>Min: {min}</span>
          <span>Max: {max}</span>
        </div>
      )}
    </div>
  );
}
