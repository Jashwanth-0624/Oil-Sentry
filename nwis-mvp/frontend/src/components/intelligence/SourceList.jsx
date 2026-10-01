import React from "react";
import { FileText, Bookmark } from "lucide-react";

export default function SourceList({ sources = [], retrieved = [] }) {
  if (!retrieved || retrieved.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "12px 0" }}>
        No grounded documents exceeded the minimum similarity threshold.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {retrieved.map((chunk, index) => {
        const similarityPct = chunk.similarity
          ? (chunk.similarity * 100).toFixed(1)
          : null;

        return (
          <div
            key={index}
            style={{
              backgroundColor: "var(--bg-panel)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 8,
                borderBottom: "1px solid var(--border-subtle)",
                paddingBottom: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Bookmark size={14} style={{ color: "var(--accent-amber)" }} />
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: "var(--text-primary)",
                  }}
                >
                  {chunk.document_name || "Operational Report"}
                </span>
                {chunk.well_id && (
                  <span className="badge badge-amber" style={{ fontSize: 10 }}>
                    Well: {chunk.well_id}
                  </span>
                )}
                {chunk.page_number && (
                  <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                    Page {chunk.page_number}
                  </span>
                )}
              </div>

              {similarityPct && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Cosine Match:
                  </span>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--status-normal)",
                    }}
                  >
                    {similarityPct}%
                  </span>
                </div>
              )}
            </div>

            <div
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                fontFamily: "var(--font-sans)",
                whiteSpace: "pre-line",
              }}
            >
              {chunk.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
