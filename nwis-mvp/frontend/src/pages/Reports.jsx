import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader";
import StatusBadge from "../components/common/StatusBadge";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import {
  FileText,
  Download,
  ArrowRight,
  Eye,
  Sparkles,
  X,
  CheckCircle,
  Database,
  ExternalLink,
  ShieldAlert,
  Activity,
  Layers,
} from "lucide-react";
import {
  getWells,
  getWell,
  getWellReport,
  getWellReportPdfUrl,
} from "../services/api";

export default function Reports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected report modal state
  const [previewWellId, setPreviewWellId] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Quick export state
  const [quickWellId, setQuickWellId] = useState("W001");

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        setError(null);
        const wells = await getWells();

        // Sample wells for summary statistics
        const detailed = await Promise.allSettled(
          wells.map((w) => getWell(w.well_id))
        );

        const rows = wells.map((well, idx) => {
          const detailRes = detailed[idx];
          const hasDetail = detailRes.status === "fulfilled";
          const eventCount = hasDetail ? detailRes.value.events?.length || 0 : 0;
          const formationCount = hasDetail ? detailRes.value.formations?.length || 0 : 0;

          return {
            well_id: well.well_id,
            field: well.field,
            depth: well.total_depth,
            status: well.status,
            events: eventCount,
            formations: formationCount,
            similar_wells: 5,
            last_analyzed: "2026-09-30 00:00",
          };
        });

        setReports(rows);
        if (wells.length > 0) {
          setQuickWellId(wells[0].well_id);
        }
      } catch (err) {
        console.error("Failed to load reports catalog:", err);
        setError(err.message || "Failed to load reports catalog.");
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  async function handleGenerateReport(wellId) {
    try {
      setPreviewWellId(wellId);
      setPreviewLoading(true);
      const data = await getWellReport(wellId);
      setPreviewData(data);
    } catch (err) {
      console.error("Failed to compile preview report:", err);
    } finally {
      setPreviewLoading(false);
    }
  }

  function handleDownloadPdf(wellId) {
    const url = getWellReportPdfUrl(wellId);
    window.open(url, "_blank", "noopener,noreferrer");
  }


  if (loading) {
    return <LoadingState message="Generating well intelligence report registry..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to Load Reports"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Well Intelligence Reports"
        subtitle="Automated offset-well dossiers and subsurface risk summaries"
        badge={
          <span className="badge badge-neutral" style={{ marginLeft: 12 }}>
            {reports.length} Reports Ready
          </span>
        }
        actions={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select
              value={quickWellId}
              onChange={(e) => setQuickWellId(e.target.value)}
              className="select font-mono"
              style={{ fontSize: 12, padding: "5px 10px" }}
            >
              {reports.map((r) => (
                <option key={r.well_id} value={r.well_id}>
                  {r.well_id} ({r.field})
                </option>
              ))}
            </select>
            <button
              onClick={() => handleDownloadPdf(quickWellId)}
              className="button button-primary"
              style={{ fontSize: 12, padding: "6px 14px" }}
              title="Download compiled PDF operational intelligence report"
            >
              <Download size={13} /> Export PDF Report
            </button>
          </div>
        }
      />

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <FileText size={16} />
            <span>Compiled Well Intelligence Dossiers</span>
          </div>
          <span className="font-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Database: 20 Calibrated Wellbores
          </span>
        </div>
        <div className="panel-body" style={{ padding: 0 }}>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Well ID</th>
                  <th>Field</th>
                  <th>Total Depth</th>
                  <th>Status</th>
                  <th>Formations</th>
                  <th>Incidents Logged</th>
                  <th>Offset Wells</th>
                  <th>Last Analyzed</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((item) => (
                  <tr key={item.well_id}>
                    <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                      {item.well_id}
                    </td>
                    <td>{item.field}</td>
                    <td className="font-mono">
                      {item.depth ? `${item.depth.toLocaleString()} m` : "—"}
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="font-mono">{item.formations} intervals</td>
                    <td className="font-mono">
                      {item.events > 0 ? (
                        <span className="badge badge-warning" style={{ fontSize: 11 }}>
                          {item.events} Events
                        </span>
                      ) : (
                        <span className="badge badge-normal" style={{ fontSize: 11 }}>
                          0 Events
                        </span>
                      )}
                    </td>
                    <td className="font-mono">{item.similar_wells} offset wells</td>
                    <td className="font-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {item.last_analyzed}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          gap: 6,
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          onClick={() => navigate(`/app/wells/${item.well_id}`)}
                          className="button button-outline"
                          style={{ padding: "4px 8px", fontSize: 11 }}
                          title="Open complete engineering dossier"
                        >
                          <Eye size={12} /> View Intelligence
                        </button>

                        <button
                          onClick={() => handleGenerateReport(item.well_id)}
                          className="button button-secondary"
                          style={{ padding: "4px 8px", fontSize: 11 }}
                          title="Generate instant intelligence preview"
                        >
                          <Sparkles size={12} style={{ color: "var(--accent-amber)" }} /> Generate Report
                        </button>

                        <button
                          onClick={() => handleDownloadPdf(item.well_id)}
                          className="button button-secondary"
                          style={{ padding: "4px 8px", fontSize: 11 }}
                          title="Download compiled PDF operational intelligence report"
                        >
                          <Download size={12} /> Export PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Comprehensive Report Preview Modal */}
      {previewWellId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setPreviewWellId(null)}
        >
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              maxWidth: 820,
              width: "100%",
              maxHeight: "88vh",
              overflowY: "auto",
              padding: 28,
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#ffffff" }}>
                  Operational Intelligence Report: {previewWellId}
                </h3>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Oil India Limited · eRTMAC-NWIS (SIH 2026 PS121)
                </span>
              </div>
              <button
                onClick={() => setPreviewWellId(null)}
                style={{ color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Synthetic Data Notice */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                backgroundColor: "var(--bg-panel)",
                border: "1px solid var(--border-subtle)",
                borderLeft: "3px solid var(--accent-amber)",
                borderRadius: "var(--radius-sm)",
                marginBottom: 18,
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              <strong style={{ color: "var(--accent-amber)", textTransform: "uppercase" }}>
                SYNTHETIC DEMONSTRATION DATA:
              </strong>{" "}
              Live drilling telemetry and operational alerts are simulated. Machine learning predictions represent model output and must not be interpreted as confirmed field incidents.
            </div>

            {previewLoading && <LoadingState message={`Compiling operational report for ${previewWellId}...`} />}

            {!previewLoading && previewData && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* 1. Well Overview */}
                <div style={{ padding: 14, backgroundColor: "var(--bg-panel)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                    1. WELL OVERVIEW & COORDINATES
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                    <div>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>FIELD</span>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{previewData.well?.field}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>TOTAL DEPTH</span>
                      <div className="font-mono" style={{ fontWeight: 600, fontSize: 13 }}>{previewData.well?.total_depth} m</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>TYPE / STATUS</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12 }}>{previewData.well?.well_type}</span>
                        <StatusBadge status={previewData.well?.status} />
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>COORDINATES</span>
                      <div className="font-mono" style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                        {previewData.well?.latitude?.toFixed(4)}° N, {previewData.well?.longitude?.toFixed(4)}° E
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Latest Drilling Telemetry */}
                <div style={{ padding: 14, backgroundColor: "var(--bg-panel)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                    2. CURRENT OPERATIONAL TELEMETRY SNAPSHOT
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
                    <div style={{ padding: 8, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 4 }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>DEPTH</div>
                      <div className="font-mono" style={{ fontSize: 13, fontWeight: 700 }}>{previewData.telemetry?.depth?.toFixed(1)} m</div>
                    </div>
                    <div style={{ padding: 8, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 4 }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>ROP</div>
                      <div className="font-mono" style={{ fontSize: 13, fontWeight: 700 }}>{previewData.telemetry?.rop?.toFixed(1)} m/hr</div>
                    </div>
                    <div style={{ padding: 8, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 4 }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>WOB</div>
                      <div className="font-mono" style={{ fontSize: 13, fontWeight: 700 }}>{previewData.telemetry?.wob?.toFixed(1)} kN</div>
                    </div>
                    <div style={{ padding: 8, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 4 }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>RPM</div>
                      <div className="font-mono" style={{ fontSize: 13, fontWeight: 700 }}>{previewData.telemetry?.rpm?.toFixed(0)}</div>
                    </div>
                    <div style={{ padding: 8, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 4 }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>TORQUE</div>
                      <div className="font-mono" style={{ fontSize: 13, fontWeight: 700 }}>{previewData.telemetry?.torque?.toFixed(1)} kN·m</div>
                    </div>
                    <div style={{ padding: 8, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 4 }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>SPP</div>
                      <div className="font-mono" style={{ fontSize: 13, fontWeight: 700 }}>{previewData.telemetry?.standpipe_pressure?.toFixed(0)} psi</div>
                    </div>
                    <div style={{ padding: 8, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 4 }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>MUD DENSITY</div>
                      <div className="font-mono" style={{ fontSize: 13, fontWeight: 700 }}>{previewData.telemetry?.mud_density?.toFixed(3)} g/cm³</div>
                    </div>
                  </div>
                </div>

                {/* 3. XGBoost Risk Assessment */}
                <div style={{ padding: 14, backgroundColor: "var(--bg-panel)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                      3. XGBOOST RISK ASSESSMENT (INFERENCE)
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                      {previewData.risk?.model_type}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 4 }}>
                    <StatusBadge status={previewData.risk?.predicted_label} />
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                        Predicted Hazard: {previewData.risk?.predicted_label}
                      </span>
                      <span className="font-mono" style={{ fontSize: 12, color: "var(--accent-amber)", marginLeft: 8 }}>
                        ({Math.round((previewData.risk?.probability || 0) * 100)}% Confidence)
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Operational Alerts */}
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-amber)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                    4. OPERATIONAL ALERTS ({previewData.alerts?.length || 0} RECORDED)
                  </h4>
                  {previewData.alerts && previewData.alerts.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {previewData.alerts.slice(0, 3).map((a) => (
                        <div
                          key={a.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px 12px",
                            backgroundColor: "var(--bg-panel)",
                            borderRadius: "var(--radius-sm)",
                            fontSize: 12,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <StatusBadge status={a.severity} />
                            <span style={{ fontWeight: 600 }}>{a.event_type}</span>
                            <span className="font-mono" style={{ color: "var(--text-muted)", fontSize: 11 }}>
                              {a.depth?.toFixed(1)}m
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span className="badge badge-neutral" style={{ fontSize: 10 }}>{a.status}</span>
                            <span className="font-mono" style={{ color: "var(--text-muted)", fontSize: 11 }}>
                              {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", padding: 8 }}>
                      No active or historical operational alerts logged for this well.
                    </div>
                  )}
                </div>

                {/* 5. Similar Offset Wells */}
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-amber)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                    5. OFFSET CORRELATIONS & SIMILAR WELLS ({previewData.similar_wells?.length || 0})
                  </h4>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {previewData.similar_wells?.map((sim) => (
                      <span key={sim.well_id} className="badge badge-amber font-mono" style={{ fontSize: 11 }}>
                        {sim.well_id}: {(sim.similarity_score * 100).toFixed(1)}% sim ({sim.distance_km?.toFixed(2)} km)
                      </span>
                    ))}
                  </div>
                </div>

                {/* 6. Historical Events */}
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-amber)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                    6. HISTORICAL WELL INCIDENTS ({previewData.historical_events?.length || 0})
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {previewData.historical_events?.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        style={{
                          padding: "8px 12px",
                          backgroundColor: "var(--bg-panel)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>{e.event_type} at {e.depth}m</span>
                          <StatusBadge status={e.severity} />
                        </div>
                        <div style={{ color: "var(--text-secondary)", fontSize: 11 }}>
                          {e.description || e.cause}
                        </div>
                      </div>
                    ))}
                    {(!previewData.historical_events || previewData.historical_events.length === 0) && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)", padding: 8 }}>
                        Zero historical incidents recorded during prior drilling operations.
                      </div>
                    )}
                  </div>
                </div>

                {/* 7. Grounded RAG Evidence */}
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-amber)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                    7. GROUNDED RAG HISTORICAL EVIDENCE ({previewData.rag_evidence?.length || 0} SOURCES)
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {previewData.rag_evidence?.slice(0, 2).map((r, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "8px 12px",
                          backgroundColor: "rgba(255,255,255,0.02)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: 11,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--accent-amber)", fontWeight: 600, marginBottom: 4 }}>
                          <span>{r.source_title}</span>
                          <span className="font-mono">Match: {(r.similarity * 100).toFixed(1)}%</span>
                        </div>
                        <p style={{ color: "var(--text-secondary)", lineHeight: 1.4, margin: 0 }}>
                          {r.text?.slice(0, 200)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: 16, marginTop: 8 }}>
                  <button
                    onClick={() => handleDownloadPdf(previewWellId)}
                    className="button button-primary"
                    style={{ fontSize: 12, padding: "8px 16px" }}
                  >
                    <Download size={13} /> Download PDF Operational Report
                  </button>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => {
                        setPreviewWellId(null);
                        navigate(`/app/wells/${previewWellId}`);
                      }}
                      className="button button-outline"
                      style={{ fontSize: 12 }}
                    >
                      Open Full Dossier <ArrowRight size={13} />
                    </button>
                    <button
                      onClick={() => setPreviewWellId(null)}
                      className="button button-ghost"
                      style={{ fontSize: 12 }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

