import React, { useState, useEffect } from "react";
import PageHeader from "../components/layout/PageHeader";
import EventTable from "../components/events/EventTable";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import { AlertOctagon } from "lucide-react";
import { getWells, getWell, getAlerts } from "../services/api";

export default function EventsExplorer() {
  const [events, setEvents] = useState([]);
  const [historicalCount, setHistoricalCount] = useState(0);
  const [simulationCount, setSimulationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadAllEvents() {
    try {
      setLoading(true);
      setError(null);
      const wellList = await getWells();

      const wellMap = {};
      wellList.forEach((w) => {
        wellMap[w.well_id] = w.field;
      });

      // 1. Retrieve historical events for all wells
      const settled = await Promise.allSettled(
        wellList.map((w) => getWell(w.well_id))
      );

      const allHistorical = [];
      settled.forEach((res) => {
        if (res.status === "fulfilled" && res.value?.events) {
          const wellId = res.value.well?.well_id;
          const field = res.value.well?.field;
          res.value.events.forEach((evt) => {
            allHistorical.push({
              ...evt,
              well_id: wellId,
              field: field || "Field-A",
              source: "HISTORICAL",
              status: "HISTORICAL",
            });
          });
        }
      });

      // 2. Retrieve live operational alerts from simulation
      let simulationAlerts = [];
      try {
        const alertsRes = await getAlerts({ limit: 100 });
        const alertList = alertsRes.alerts || [];
        simulationAlerts = alertList.map((a) => ({
          id: `sim-${a.id}`,
          raw_id: a.id,
          well_id: a.well_id,
          field: wellMap[a.well_id] || "Field-A",
          depth: a.depth,
          formation: "Operational Horizon",
          event_type: a.event_type,
          severity: a.severity,
          source: "LIVE SIMULATION",
          status: a.status || "ACTIVE",
          probability: a.probability,
          cause:
            a.description ||
            `Model-predicted ${a.event_type} risk condition based on synthetic telemetry (${Math.round(
              (a.probability || 0) * 100
            )}% confidence).`,
          mitigation:
            a.status === "RECOVERED"
              ? "Dynamics stabilized; condition returned below threshold."
              : a.status === "ACKNOWLEDGED"
              ? "Operator acknowledged; ongoing monitoring."
              : "Review live ROP, torque, and pressure parameters.",
          outcome:
            a.status === "ACTIVE"
              ? "Active simulation condition."
              : `Alert resolved (${a.status}).`,
          created_at: a.created_at,
        }));
      } catch (alertErr) {
        console.warn("Could not load operational alerts:", alertErr);
      }

      setHistoricalCount(allHistorical.length);
      setSimulationCount(simulationAlerts.length);

      // Combine: Active simulation alerts first, then historical incidents sorted by severity
      const combined = [...simulationAlerts, ...allHistorical];
      setEvents(combined);
    } catch (err) {
      console.error("Failed to load events:", err);
      setError(err.message || "Failed to communicate with the FastAPI backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllEvents();
  }, []);

  if (loading) {
    return <LoadingState message="Aggregating fleet historical incidents and simulation alerts..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to Load Events"
        message={error}
        onRetry={loadAllEvents}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Fleet Incidents & Operational Alerts"
        subtitle="Historical drilling events alongside live model-generated simulation alerts"
        badge={
          <div style={{ display: "inline-flex", gap: 8, marginLeft: 12 }}>
            <span className="badge badge-stuck">
              {historicalCount} Historical
            </span>
            <span className="badge badge-warning">
              {simulationCount} Live Simulation
            </span>
          </div>
        }
      />

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <AlertOctagon size={16} />
            <span>Master Fleet Event & Alert Log</span>
          </div>
          <span className="font-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Aggregated Across 20 Wells & Telemetry Streams
          </span>
        </div>
        <div className="panel-body">
          <EventTable events={events} showFilters={true} showWellColumn={true} />
        </div>
      </div>
    </div>
  );
}

