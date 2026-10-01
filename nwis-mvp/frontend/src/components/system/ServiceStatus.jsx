import React from "react";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

const STATUS_ICONS = {
  OPERATIONAL: <CheckCircle2 size={16} style={{ color: "var(--status-normal)" }} />,
  NOT_CONFIGURED: <AlertCircle size={16} style={{ color: "var(--status-loss)" }} />,
  OFFLINE: <XCircle size={16} style={{ color: "var(--status-stuck)" }} />,
};

const STATUS_CLASSES = {
  OPERATIONAL: "badge-normal",
  NOT_CONFIGURED: "badge-warning",
  OFFLINE: "badge-stuck",
};

export default function ServiceStatus({ services = [] }) {
  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Subsystem / Component</th>
            <th>Technology / Model</th>
            <th>Operational Status</th>
            <th>Port / Protocol</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {services.map((svc) => {
            const icon = STATUS_ICONS[svc.status] || STATUS_ICONS.OPERATIONAL;
            const badgeClass = STATUS_CLASSES[svc.status] || "badge-neutral";

            return (
              <tr key={svc.name}>
                <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  {svc.name}
                </td>
                <td className="font-mono">{svc.tech}</td>
                <td>
                  <span
                    className={`badge ${badgeClass}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    {icon}
                    <span>{svc.status.replace("_", " ")}</span>
                  </span>
                </td>
                <td className="font-mono" style={{ color: "var(--text-muted)" }}>
                  {svc.endpoint || "—"}
                </td>
                <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {svc.details}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
