import React, { useState, useEffect } from "react";
import PageHeader from "../components/layout/PageHeader";
import RetrievalResults from "../components/intelligence/RetrievalResults";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import { Brain, Search, Database, Sparkles, Send, HelpCircle } from "lucide-react";
import { queryIntelligence, getWells } from "../services/api";

const EXAMPLE_QUESTIONS = [
  "What historical drilling problems occurred in wells similar to W001?",
  "What mitigation strategies were recorded for stuck pipe events?",
  "What historical drilling problems occurred around 3200–3500m?",
  "Which historical wells had similar formations?",
  "What lessons can be derived from historical events around W005?",
  "What risks are supported by historical evidence for this well?",
];

export default function IntelligenceCenter() {
  const [wells, setWells] = useState([]);
  const [selectedWell, setSelectedWell] = useState("");
  const [question, setQuestion] = useState(EXAMPLE_QUESTIONS[0]);
  const [topK, setTopK] = useState(5);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadWells() {
      try {
        const list = await getWells();
        setWells(list);
        if (list.length) setSelectedWell(list[0].well_id);
      } catch (err) {
        console.error("Could not fetch well catalog for selector:", err);
      }
    }
    loadWells();
  }, []);

  async function handleQuery(queryText = question) {
    if (!queryText.trim()) return;

    try {
      setLoading(true);
      setError(null);
      if (!selectedWell) throw new Error("Select a well before asking for intelligence.");
      const data = await queryIntelligence(selectedWell, queryText);
      setResults(data);
    } catch (err) {
      console.error("RAG retrieval failed:", err);
      setError(err.message || "Failed to execute pgvector cosine retrieval.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Intelligence Center"
        subtitle="Historical drilling knowledge and nearby-well intelligence"
        badge={
          <span className="badge badge-normal" style={{ marginLeft: 12 }}>
            Native pgvector 0.8.6 Active
          </span>
        }
      />

      <div className="grid-split-1-2">
        {/* Left: Query Workstation Panel */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Search size={16} />
              <span>Query Workbench</span>
            </div>
          </div>
          <div className="panel-body">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleQuery();
              }}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  TARGET WELL
                </label>
                <select
                  value={selectedWell}
                  onChange={(e) => setSelectedWell(e.target.value)}
                  className="select font-mono"
                  style={{ width: "100%" }}
                >
                  <option value="">Select a well</option>
                  {wells.map((w) => (
                    <option key={w.well_id} value={w.well_id}>
                      {w.well_id} — {w.field}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  ENGINEERING INQUIRY / KEYWORDS
                </label>
                <textarea
                  rows={4}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about historical drilling incidents, stuck pipe mitigations, formation pressures..."
                  className="input"
                  style={{ width: "100%", resize: "vertical", fontSize: 13, lineHeight: 1.5 }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  GENERATION MODE
                </label>
                <select
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="select font-mono"
                  style={{ width: "100%" }}
                >
                  <option value={5}>Grounded Gemini Response</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="button button-primary"
                style={{ width: "100%", padding: "10px" }}
              >
                <Sparkles size={15} />
                <span>{loading ? "Preparing grounded response..." : "Ask NWIS"}</span>
              </button>
            </form>

            <div style={{ marginTop: 24 }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <HelpCircle size={13} />
                <span>Curated Engineering Inquiries</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {EXAMPLE_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuestion(q);
                      handleQuery(q);
                    }}
                    style={{
                      textAlign: "left",
                      padding: "8px 10px",
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      lineHeight: 1.4,
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = "var(--accent-amber)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = "var(--border-subtle)")
                    }
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Retrieved Intelligence Results Panel */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Brain size={16} />
              <span>Historical Intelligence & Evidence</span>
            </div>
            {results && (
              <span className="badge badge-neutral font-mono">
                {results.evidence?.length || 0} Evidence Sources
              </span>
            )}
          </div>
          <div className="panel-body">
            {loading && <LoadingState message="Retrieving verified project context and preparing a grounded response..." />}

            {!loading && error && (
              <ErrorState
                title="RAG Search Error"
                message={error}
                onRetry={() => handleQuery()}
              />
            )}

            {!loading && !error && !results && (
              <div
                style={{
                  padding: "48px 20px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Brain size={36} style={{ color: "var(--accent-steel)", opacity: 0.5 }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                  Drilling Intelligence Standby
                </div>
                <div style={{ fontSize: 13, maxWidth: 440, lineHeight: 1.5, color: "var(--text-secondary)" }}>
                  Submit an engineering inquiry or select one of the curated queries on the left to execute pgvector cosine retrieval and grounded synthesis across offset operational records.
                </div>
              </div>
            )}

            {!loading && !error && results && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div><div className="section-label">INTELLIGENCE</div><p style={{ lineHeight: 1.6 }}>{results.answer || "Generation is unavailable; verified evidence is retained below."}</p></div>
                  {results.key_findings?.length > 0 && <div><div className="section-label">KEY FINDINGS</div><ul>{results.key_findings.map((finding, i) => <li key={i}>{finding}</li>)}</ul></div>}
                  <div><div className="section-label">MODEL CONTEXT</div><p>Predicted Risk: {results.risk_context?.predicted_event || "Unavailable"}<br />Probability: {results.risk_context?.probability != null ? `${(results.risk_context.probability * 100).toFixed(1)}%` : "Unavailable"}<br />Source: XGBoost</p></div>
                  <div><div className="section-label">EVIDENCE</div>{results.evidence?.map((source, i) => <p key={i} className="font-mono">{source.source} {source.similarity != null ? `· similarity ${source.similarity.toFixed(3)}` : ""}</p>)}</div>
                  {results.limitations?.length > 0 && <div><div className="section-label">LIMITATIONS</div><ul>{results.limitations.map((item, i) => <li key={i}>{item}</li>)}</ul></div>}
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
