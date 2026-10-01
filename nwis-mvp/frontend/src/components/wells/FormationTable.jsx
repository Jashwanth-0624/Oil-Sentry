import React from "react";

export default function FormationTable({ formations = [] }) {
  if (!formations || formations.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", padding: "16px 0" }}>
        No formation intervals logged for this well.
      </div>
    );
  }

  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Formation Name</th>
            <th>Top Depth (m)</th>
            <th>Bottom Depth (m)</th>
            <th>Lithology</th>
            <th>Pore Pressure (psi)</th>
            <th>Temperature (°C)</th>
          </tr>
        </thead>
        <tbody>
          {formations.map((f, idx) => (
            <tr key={f.id || idx}>
              <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                {f.formation_name}
              </td>
              <td className="font-mono">
                {f.top_depth !== null && f.top_depth !== undefined
                  ? f.top_depth.toLocaleString()
                  : "—"}
              </td>
              <td className="font-mono">
                {f.bottom_depth !== null && f.bottom_depth !== undefined
                  ? f.bottom_depth.toLocaleString()
                  : "—"}
              </td>
              <td>
                <span className="badge badge-neutral">{f.lithology ?? "Unknown"}</span>
              </td>
              <td className="font-mono">
                {f.pressure !== null && f.pressure !== undefined
                  ? f.pressure.toLocaleString()
                  : "—"}
              </td>
              <td className="font-mono">
                {f.temperature !== null && f.temperature !== undefined
                  ? `${f.temperature.toFixed(1)}`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
