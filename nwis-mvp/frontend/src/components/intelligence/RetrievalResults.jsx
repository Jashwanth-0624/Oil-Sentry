import React from "react";
import {
  FileText,
  Database,
  CheckCircle,
  AlertCircle,
  Cpu,
  ShieldCheck,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import SourceList from "./SourceList";

export default function RetrievalResults({ historicalContext }) {
  if (!historicalContext) {
    return (
      <div style={{ color: "var(--text-muted)", padding: "16px 0" }}>
        No historical RAG retrieval context available for this well.
      </div>
    );
  }

  const {
    question,
    answer,
    generation_status,
    retrieval_backend,
    pgvector_enabled,
    min_similarity,
    top_k,
    embedding_model,
    llm,
    evidence = [],
    confidence,
    limitations = [],
    grounded = true,
    sources = [],
    retrieved = [],
  } = historicalContext;

  const isLlmNotConfigured = generation_status === "llm_not_configured";
  const isNoEvidence = generation_status === "no_evidence";
  const isOk = generation_status === "ok";
  const isAuthError = generation_status === "authentication_error";
  const isProviderError = generation_status === "provider_error";

  const llmConfigured = llm?.configured ?? false;
  const llmProvider = llm?.provider || (isLlmNotConfigured ? "None configured" : "OpenAI");
  const llmModel = llm?.model || (isLlmNotConfigured ? "N/A" : "gpt-4o-mini");

  return (
    <div>
      {/* Dual Technical Metrics Header: Retrieval + LLM Status */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {/* Retrieval Engine Status */}
        <div
          style={{
            padding: "12px 14px",
            backgroundColor: "var(--bg-panel)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Database size={15} style={{ color: "var(--accent-amber)" }} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-muted)",
                }}
              >
                RETRIEVAL ENGINE
              </span>
            </div>
            <span className="badge badge-normal" style={{ fontSize: 10 }}>
              <CheckCircle size={11} /> pgvector Active
            </span>
          </div>

          <div className="font-mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
            {retrieval_backend || "pgvector_cosine"}
          </div>

          <div
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              display: "flex",
              justifyContent: "space-between",
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: 6,
              marginTop: 2,
            }}
          >
            <span>Model: {embedding_model || "all-MiniLM-L6-v2"} (384-dim)</span>
            <span>Top-K: {top_k || retrieved.length}</span>
          </div>
        </div>

        {/* LLM Generation Status */}
        <div
          style={{
            padding: "12px 14px",
            backgroundColor: "var(--bg-panel)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Cpu size={15} style={{ color: llmConfigured ? "var(--status-normal)" : "var(--accent-amber)" }} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-muted)",
                }}
              >
                LLM SYNTHESIS LAYER
              </span>
            </div>
            {llmConfigured ? (
              <span className="badge badge-normal" style={{ fontSize: 10 }}>
                <CheckCircle size={11} /> Connected ({llmProvider})
              </span>
            ) : (
              <span className="badge badge-warning" style={{ fontSize: 10 }}>
                <AlertCircle size={11} /> Not Configured
              </span>
            )}
          </div>

          <div className="font-mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
            Provider: {llmProvider} {llmModel !== "N/A" ? `· ${llmModel}` : ""}
          </div>

          <div
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              display: "flex",
              justifyContent: "space-between",
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: 6,
              marginTop: 2,
            }}
          >
            <span>Constraint: Strictly Grounded</span>
            <span>Status: {llm?.status || (isLlmNotConfigured ? "not_configured" : "active")}</span>
          </div>
        </div>
      </div>

      {/* Query Banner */}
      <div
        style={{
          padding: "10px 14px",
          backgroundColor: "var(--bg-primary)",
          borderRadius: "var(--radius-sm)",
          borderLeft: "3px solid var(--accent-amber)",
          marginBottom: "16px",
        }}
      >
        <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.08em" }}>
          HISTORICAL DRILLING QUERY
        </div>
        <div style={{ fontSize: 13, color: "var(--text-primary)", marginTop: 4, fontWeight: 500 }}>
          "{question}"
        </div>
      </div>

      {/* AI-Generated Historical Insight Section */}
      <div
        style={{
          padding: "16px",
          backgroundColor: isLlmNotConfigured ? "var(--bg-card)" : "var(--bg-surface-elevated)",
          borderRadius: "var(--radius-sm)",
          border: `1px solid ${isLlmNotConfigured ? "var(--border-subtle)" : "var(--accent-amber-border)"}`,
          marginBottom: "20px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 12,
            borderBottom: "1px solid var(--border-subtle)",
            paddingBottom: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} style={{ color: "var(--accent-amber)" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.04em" }}>
              AI-GENERATED HISTORICAL INSIGHT
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {grounded && (
              <span className="badge badge-normal" style={{ fontSize: 10 }}>
                <ShieldCheck size={11} /> Grounded in Retrieved Records
              </span>
            )}
            {confidence && (
              <span
                className={`badge ${
                  confidence === "high"
                    ? "badge-normal"
                    : confidence === "medium"
                    ? "badge-warning"
                    : "badge-neutral"
                }`}
                style={{ fontSize: 10, textTransform: "uppercase" }}
              >
                Confidence: {confidence}
              </span>
            )}
          </div>
        </div>

        {/* Answer Content */}
        {isLlmNotConfigured ? (
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "var(--accent-amber-subtle)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid rgba(212, 151, 59, 0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <AlertCircle size={15} style={{ color: "var(--accent-amber)" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-amber)" }}>
                LLM Generation Notice
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              LLM generation is not configured. Historical evidence retrieval remains available.
              Offset drilling records were retrieved from PostgreSQL pgvector and are presented below directly without generative fabrication.
            </p>
          </div>
        ) : (
          <div
            style={{
              fontSize: 13,
              color: "var(--text-primary)",
              lineHeight: 1.65,
              whiteSpace: "pre-line",
            }}
          >
            {answer}
          </div>
        )}

        {/* Limitations Notice */}
        {limitations && limitations.length > 0 && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 8,
              borderTop: "1px solid var(--border-subtle)",
              fontSize: 11,
              color: "var(--text-muted)",
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            {limitations.map((lim, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Info size={11} />
                <span>{lim}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Retrieved Sources and Document Chunks */}
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--text-muted)",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <FileText size={15} />
          <span>Retrieved Evidence & Grounded Operational Records ({retrieved.length})</span>
        </div>

        <SourceList sources={sources} retrieved={retrieved} />
      </div>
    </div>
  );
}

