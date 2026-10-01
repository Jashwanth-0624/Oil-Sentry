import React from "react";

export default function StatusBadge({ status, type = "default" }) {
  if (!status) return <span className="badge badge-neutral">N/A</span>;

  const normalized = String(status).toUpperCase().replace(/\s+/g, "_");

  let badgeClass = "badge-neutral";

  if (
    normalized === "NORMAL" ||
    normalized === "PRODUCING" ||
    normalized === "OPERATIONAL" ||
    normalized === "CONNECTED" ||
    normalized === "LOW"
  ) {
    badgeClass = "badge-normal";
  } else if (
    normalized === "STUCK_PIPE" ||
    normalized === "CRITICAL" ||
    normalized === "HIGH" ||
    normalized === "OFFLINE" ||
    normalized === "ABANDONED"
  ) {
    badgeClass = "badge-stuck";
  } else if (
    normalized === "MUD_LOSS" ||
    normalized === "WARNING" ||
    normalized === "MEDIUM" ||
    normalized === "SUSPENDED" ||
    normalized === "NOT_CONFIGURED"
  ) {
    badgeClass = "badge-loss";
  } else if (
    normalized === "HIGH_TORQUE" ||
    normalized === "DRILLING" ||
    normalized === "EXPLORATION"
  ) {
    badgeClass = "badge-torque";
  } else if (normalized === "DEVELOPMENT") {
    badgeClass = "badge-info";
  }

  return (
    <span className={`badge ${badgeClass}`}>
      {status}
    </span>
  );
}
