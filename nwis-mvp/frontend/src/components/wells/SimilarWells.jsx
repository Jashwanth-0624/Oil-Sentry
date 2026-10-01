import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Compass } from "lucide-react";
import StatusBadge from "../common/StatusBadge";

export default function SimilarWells({ similarWells = [] }) {
  const navigate = useNavigate();

  if (!similarWells || similarWells.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", padding: "16px 0" }}>
        No offset wells found within the search radius.
      </div>
    );
  }

  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Offset Well</th>
            <th>Field</th>
            <th>Similarity Score</th>
            <th>Distance (km)</th>
            <th>Formation Sim</th>
            <th>Depth Sim</th>
            <th>Common Formations</th>
            <th>Status</th>
            <th style={{ textAlign: "right" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {similarWells.map((item) => {
            const score = item.similarity_score;
            return (
              <tr key={item.well_id}>
                <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  {item.well_id}
                </td>
                <td>{item.field ?? "—"}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 60,
                        height: 6,
                        backgroundColor: "var(--bg-primary)",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(0, score))}%`,
                          height: "100%",
                          backgroundColor:
                            score >= 80
                              ? "var(--status-normal)"
                              : score >= 60
                              ? "var(--accent-amber)"
                              : "var(--accent-steel)",
                        }}
                      />
                    </div>
                    <span
                      className="font-mono"
                      style={{
                        fontWeight: 700,
                        color:
                          score >= 80
                            ? "var(--status-normal)"
                            : score >= 60
                            ? "var(--accent-amber-hover)"
                            : "var(--text-secondary)",
                      }}
                    >
                      {score.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="font-mono">
                  {item.distance_km ? `${item.distance_km.toFixed(2)} km` : "—"}
                </td>
                <td className="font-mono">
                  {item.formation_similarity
                    ? `${(item.formation_similarity * 100).toFixed(0)}%`
                    : "—"}
                </td>
                <td className="font-mono">
                  {item.depth_similarity
                    ? `${(item.depth_similarity * 100).toFixed(0)}%`
                    : "—"}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {item.common_formations && item.common_formations.length > 0 ? (
                      item.common_formations.map((f) => (
                        <span
                          key={f}
                          className="badge badge-neutral"
                          style={{ fontSize: 10, padding: "1px 5px" }}
                        >
                          {f}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>None</span>
                    )}
                  </div>
                </td>
                <td>
                  <StatusBadge status={item.status} />
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    onClick={() => navigate(`/app/wells/${item.well_id}`)}
                    className="button button-outline"
                    style={{ padding: "3px 8px", fontSize: 11 }}
                  >
                    Inspect <ArrowRight size={11} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
