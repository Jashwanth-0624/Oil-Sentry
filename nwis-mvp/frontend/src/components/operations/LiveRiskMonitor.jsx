import React from "react";
import StatusBadge from "../common/StatusBadge";
import RiskDistribution from "../risk/RiskDistribution";
import { ShieldCheck, AlertTriangle } from "lucide-react";

export default function LiveRiskMonitor({
  currentRisk = "NORMAL",
  probability = 0.95,
  probabilities = {
    NORMAL: 0.95,
    STUCK_PIPE: 0.02,
    MUD_LOSS: 0.01,
    HIGH_TORQUE: 0.02,
  },
  isOnline = false,
  scenario = "automatic",
}) {
  const probPercent = Math.round((probability || 0) * 100);

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">
          <ShieldCheck size={16} />
          <span>Real-Time XGBoost Risk Monitor</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className={`status-dot ${isOnline ? "" : "offline"}`} />
          <span
            className="font-mono"
            style={{
              fontSize: 11,
              color: isOnline ? "var(--status-normal)" : "var(--status-stuck)",
              fontWeight: 600,
            }}
          >
            {isOnline ? "INFERENCE LIVE (1 Hz)" : "STREAM OFFLINE"}
          </span>
        </div>
      </div>

      <div className="panel-body">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            backgroundColor: "var(--bg-panel)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-subtle)",
            marginBottom: "16px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-muted)",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              MODEL PREDICTION (XGBOOST)
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>
                {currentRisk}
              </span>
              <StatusBadge status={currentRisk} />
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-muted)",
                fontWeight: 600,
                marginBottom: 2,
              }}
            >
              CONFIDENCE
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: 18,
                fontWeight: 700,
                color:
                  currentRisk === "NORMAL"
                    ? "var(--status-normal)"
                    : "var(--accent-amber)",
              }}
            >
              {isOnline ? `${probPercent}%` : "—"}
            </div>
          </div>
        </div>


        <div style={{ marginTop: 12 }}>
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
            Model Softmax Probabilities
          </div>
          <RiskDistribution probabilities={probabilities} />
        </div>
      </div>
    </div>
  );
}
