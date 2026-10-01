import React from "react";
import StatusBadge from "../common/StatusBadge";

const EVENT_LABELS = {
  0: "NORMAL",
  1: "STUCK_PIPE",
  2: "MUD_LOSS",
  3: "HIGH_TORQUE",
};

export default function DrillingTable({ drillingLogs = [] }) {
  if (!drillingLogs || drillingLogs.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", padding: "16px 0" }}>
        No recent sensor drilling logs available for this well.
      </div>
    );
  }

  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Depth (m)</th>
            <th>ROP (m/hr)</th>
            <th>WOB (klbf)</th>
            <th>RPM</th>
            <th>Torque (kN·m)</th>
            <th>SPP (psi)</th>
            <th>Mud Density (g/cm³)</th>
            <th>Risk State</th>
          </tr>
        </thead>
        <tbody>
          {drillingLogs.map((log) => {
            const formattedTime = log.timestamp
              ? new Date(log.timestamp).toLocaleString("en-US", {
                  dateStyle: "short",
                  timeStyle: "medium",
                })
              : "—";

            const labelStr =
              EVENT_LABELS[log.event_label] || `CLASS_${log.event_label}`;

            return (
              <tr key={log.id}>
                <td className="font-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {formattedTime}
                </td>
                <td className="font-mono" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {log.depth?.toFixed(1) ?? "—"}
                </td>
                <td className="font-mono">{log.rop?.toFixed(1) ?? "—"}</td>
                <td className="font-mono">{log.wob?.toFixed(1) ?? "—"}</td>
                <td className="font-mono">{log.rpm?.toFixed(0) ?? "—"}</td>
                <td className="font-mono">{log.torque?.toFixed(1) ?? "—"}</td>
                <td className="font-mono">{log.standpipe_pressure?.toFixed(0) ?? "—"}</td>
                <td className="font-mono">{log.mud_density?.toFixed(2) ?? "—"}</td>
                <td>
                  <StatusBadge status={labelStr} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
