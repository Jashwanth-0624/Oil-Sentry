import React from "react";
import StatusBadge from "../common/StatusBadge";
import RiskDistribution from "./RiskDistribution";
import { ShieldAlert, Cpu } from "lucide-react";

export default function RiskCard({ risk }) {
  if (!risk) {
    return (
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <ShieldAlert size={16} />
            <span>ML Drilling Risk Assessment</span>
          </div>
        </div>
        <div className="panel-body">
          <div style={{ color: "var(--text-muted)", padding: "16px 0" }}>
            Insufficient recent telemetry logs to infer real-time risk.
          </div>
        </div>
      </div>
    );
  }

  const { predicted_label, probabilities, risk_summary } = risk;
  const confidencePercent = risk_summary?.risk_probability
    ? (risk_summary.risk_probability * 100).toFixed(1)
    : "—";

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">
          <ShieldAlert size={16} />
          <span>ML Drilling Risk Assessment</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Cpu size={14} className="text-muted" />
          <span className="font-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
            XGBoost (4-Class Multi)
          </span>
        </div>
      </div>

      <div className="panel-body">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            backgroundColor: "var(--bg-panel)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-subtle)",
            marginBottom: "16px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-muted)",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              PREDICTED HAZARD STATE
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <StatusBadge status={predicted_label} />
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                at latest logged depth
              </span>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-muted)",
                fontWeight: 600,
                marginBottom: 2,
              }}
            >
              CONFIDENCE PROBABILITY
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {confidencePercent}%
            </div>
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--text-muted)",
              marginBottom: 8,
            }}
          >
            Multi-Class Probability Distribution
          </div>
          <RiskDistribution probabilities={probabilities} />
        </div>
      </div>
    </div>
  );
}
