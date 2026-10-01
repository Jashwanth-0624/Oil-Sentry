import React from "react";

export default function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  accent = "amber",
}) {
  return (
    <div className={`metric-card accent-${accent}`}>
      <div className="metric-header">
        <span className="metric-label">{label}</span>
        {Icon && <Icon size={16} className="text-muted" />}
      </div>
      <div className="metric-value font-mono">{value}</div>
      {subtext && <div className="metric-sub">{subtext}</div>}
    </div>
  );
}
