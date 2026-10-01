import React, { useEffect, useState } from "react";
import PageHeader from "../components/layout/PageHeader";
import WellTable from "../components/wells/WellTable";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import { getWells } from "../services/api";
import { Layers } from "lucide-react";

export default function WellsRegistry() {
  const [wells, setWells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchWells() {
    try {
      setLoading(true);
      setError(null);
      const data = await getWells();
      setWells(data);
    } catch (err) {
      console.error("Failed to load wells registry:", err);
      setError(err.message || "Failed to communicate with the FastAPI backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWells();
  }, []);

  if (loading) {
    return <LoadingState message="Loading well inventory catalog..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to Load Well Registry"
        message={error}
        onRetry={fetchWells}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Well Registry"
        subtitle="Historical and operational well inventory"
        badge={
          <span className="badge badge-amber" style={{ marginLeft: 12 }}>
            {wells.length} Wells Active
          </span>
        }
      />

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <Layers size={16} />
            <span>Operational & Offset Wells Directory</span>
          </div>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            PostgreSQL / PostGIS Database
          </span>
        </div>
        <div className="panel-body">
          <WellTable wells={wells} />
        </div>
      </div>
    </div>
  );
}
