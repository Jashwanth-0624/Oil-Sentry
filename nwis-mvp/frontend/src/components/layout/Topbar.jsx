import React from "react";
import { useLocation, Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const ROUTE_CONFIG = {
  "/app": { section: "Operations", title: "Operations Overview" },
  "/app/wells": { section: "Operations", title: "Well Registry" },
  "/app/map": { section: "Operations", title: "Field Spatial Map" },
  "/app/live": { section: "Operations", title: "Live Operations" },
  "/app/intelligence": { section: "Intelligence", title: "Intelligence Center" },
  "/app/events": { section: "Intelligence", title: "Historical Events" },
  "/app/reports": { section: "Intelligence", title: "Well Reports" },
  "/app/system": { section: "System", title: "System Status" },
};

export default function Topbar({ apiConnected = true }) {
  const location = useLocation();

  let section = "Operations";
  let title = "Operations Overview";

  if (ROUTE_CONFIG[location.pathname]) {
    section = ROUTE_CONFIG[location.pathname].section;
    title = ROUTE_CONFIG[location.pathname].title;
  } else if (location.pathname.startsWith("/app/wells/")) {
    const wellId = location.pathname.split("/")[3];
    section = "Wells";
    title = `Well Dossier: ${wellId || ""}`;
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-breadcrumb">
          <Link to="/app" style={{ color: "var(--text-muted)" }}>
            Oil Sentry
          </Link>
          <ChevronRight size={12} style={{ color: "var(--text-dim)" }} />
          <span style={{ color: "var(--text-secondary)" }}>{section}</span>
          <ChevronRight size={12} style={{ color: "var(--text-dim)" }} />
        </div>
        <span className="topbar-page-title">{title}</span>
      </div>

      <div className="topbar-right">
        <div className={`system-badge ${apiConnected ? "connected" : ""}`}>
          <span className={`status-dot ${apiConnected ? "" : "offline"}`} />
          <span>{apiConnected ? "API CONNECTED" : "API OFFLINE"}</span>
        </div>
      </div>
    </header>
  );
}
