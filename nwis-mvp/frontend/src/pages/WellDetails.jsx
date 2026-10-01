import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader";
import WellMetadata from "../components/wells/WellMetadata";
import FormationTable from "../components/wells/FormationTable";
import DrillingTable from "../components/wells/DrillingTable";
import SimilarWells from "../components/wells/SimilarWells";
import RiskCard from "../components/risk/RiskCard";
import RetrievalResults from "../components/intelligence/RetrievalResults";
import EventTable from "../components/events/EventTable";
import WellMap from "../components/Map/WellMap";
import StatusBadge from "../components/common/StatusBadge";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import {
  Compass,
  Layers,
  Activity,
  AlertTriangle,
  Brain,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { getWellIntelligence, getWells } from "../services/api";

export default function WellDetails() {
  const { wellId } = useParams();
  const navigate = useNavigate();

  const [intelligence, setIntelligence] = useState(null);
  const [allWells, setAllWells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchWellData() {
    try {
      setLoading(true);
      setError(null);

      // Fetch intelligence payload
      const [intelData, catalog] = await Promise.all([
        getWellIntelligence(wellId),
        getWells().catch(() => []),
      ]);

      setIntelligence(intelData);
      setAllWells(catalog);
    } catch (err) {
      console.error(`Failed to load intelligence for well ${wellId}:`, err);
      if (err.response?.status === 404) {
        setError(`Well '${wellId}' was not found in the NWIS operational database. Please check the well identifier and try again.`);
      } else {
        setError(err.message || "Failed to communicate with the FastAPI backend.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWellData();
  }, [wellId]);

  if (loading) {
    return <LoadingState message={`Fetching consolidated engineering dossier for ${wellId}...`} />;
  }

  if (error) {
    return (
      <ErrorState
        title={`Well Lookup Failed: ${wellId}`}
        message={error}
        onRetry={fetchWellData}
        backPath="/app/wells"
        backLabel="Return to Well Registry"
      />
    );
  }

  const {
    well,
    formations = [],
    recent_drilling = [],
    events = [],
    similar_wells = [],
    risk,
    historical_context,
  } = intelligence || {};

  // Construct map well points (current well + similar offset wells)
  const mapWells = [
    well,
    ...similar_wells
      .map((sim) => {
        const match = allWells.find((w) => w.well_id === sim.well_id);
        return match || null;
      })
      .filter(Boolean),
  ].filter(Boolean);

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <button
          onClick={() => navigate("/app/wells")}
          className="button button-secondary"
          style={{ padding: "6px 12px", fontSize: 12 }}
        >
          <ArrowLeft size={13} /> Back to Well Registry
        </button>
      </div>

      {/* Header: Well ID, Field, Status */}
      <PageHeader
        title={`Well ${well?.well_id ?? wellId}`}
        subtitle={`${well?.field ?? "Unknown Field"} · Subsurface Operations & Offset Analysis`}
        badge={<StatusBadge status={well?.status} />}
        actions={
          <button
            onClick={() => navigate("/app/intelligence")}
            className="button button-outline"
          >
            <Brain size={14} /> Open in Intelligence Center
          </button>
        }
      />

      {/* 1. Well Overview */}
      <WellMetadata well={well} />

      {/* 2. Formation Profile */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <Layers size={16} />
            <span>Formation Profile</span>
          </div>
          <span className="badge badge-neutral font-mono">{formations.length} Lithology Intervals</span>
        </div>
        <div className="panel-body">
          <FormationTable formations={formations} />
        </div>
      </div>

      {/* 3. Recent Drilling */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <Activity size={16} />
            <span>Recent Drilling Telemetry</span>
          </div>
          <span className="badge badge-neutral font-mono">Depth-Indexed Records ({recent_drilling.length})</span>
        </div>
        <div className="panel-body">
          <DrillingTable drillingLogs={recent_drilling} />
        </div>
      </div>

      {/* 4. Historical Events */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <AlertTriangle size={16} />
            <span>Historical Events & Mitigation</span>
          </div>
          <span className="badge badge-neutral font-mono">{events.length} Documented Incidents</span>
        </div>
        <div className="panel-body">
          <EventTable events={events} showFilters={false} showWellColumn={false} />
        </div>
      </div>

      {/* 5. Similar Wells */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <Compass size={16} />
            <span>Similar Offset Wells</span>
          </div>
          <span className="badge badge-amber font-mono">
            {similar_wells.length} Nearest Correlated Wells
          </span>
        </div>
        <div className="panel-body">
          <SimilarWells similarWells={similar_wells} />
        </div>
      </div>

      {/* 6. Risk Assessment */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <ShieldCheck size={16} />
            <span>Risk Assessment</span>
          </div>
          <span className="badge badge-neutral font-mono">XGBoost Multiclass Inference</span>
        </div>
        <div className="panel-body">
          <div className="grid-split-2-1">
            <RiskCard risk={risk} />
            <div>
              <div
                style={{
                  backgroundColor: "var(--bg-panel)",
                  padding: "16px 20px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 8 }}>
                  OFFSET POSITIONING
                </div>
                <div style={{ height: "240px", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                  <WellMap
                    wells={mapWells}
                    currentWellId={well?.well_id}
                    height="240px"
                  />
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 8,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Red: Target ({well?.well_id})</span>
                  <span>Amber: Offsets</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Historical Intelligence */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <Brain size={16} />
            <span>Historical Grounded Intelligence (RAG)</span>
          </div>
          <span className="badge badge-normal font-mono">Native pgvector 0.8.6 Cosine</span>
        </div>
        <div className="panel-body">
          <RetrievalResults historicalContext={historical_context} />
        </div>
      </div>
    </div>
  );
}
