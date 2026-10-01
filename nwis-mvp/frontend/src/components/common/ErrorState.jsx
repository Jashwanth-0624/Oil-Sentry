import React from "react";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ErrorState({
  title = "Failed to load telemetry",
  message = "An error occurred while communicating with the FastAPI backend.",
  onRetry,
  backPath,
  backLabel,
}) {
  const navigate = useNavigate();

  return (
    <div className="state-container" style={{ textAlign: "center", padding: "60px 20px" }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          backgroundColor: "rgba(239, 68, 68, 0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
          border: "1px solid rgba(239, 68, 68, 0.3)",
        }}
      >
        <AlertTriangle size={24} style={{ color: "var(--status-stuck)" }} />
      </div>
      <div className="state-title" style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>
        {title}
      </div>
      <div className="state-desc" style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 520, margin: "0 auto 20px", lineHeight: 1.6 }}>
        {message}
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        {onRetry && (
          <button onClick={onRetry} className="button button-primary">
            <RotateCcw size={14} /> Retry Request
          </button>
        )}
        {backPath && (
          <button onClick={() => navigate(backPath)} className="button button-secondary">
            <ArrowLeft size={14} /> {backLabel || "Go Back"}
          </button>
        )}
      </div>
    </div>
  );
}
