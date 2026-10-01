import React from "react";
import { NavLink, Link } from "react-router-dom";
import {
  Activity,
  Layers,
  MapPin,
  Radio,
  Brain,
  AlertOctagon,
  FileText,
  Server,
  Compass,
  ArrowUpRight,
} from "lucide-react";

export default function Sidebar({ apiConnected = true }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-icon">
          <Compass size={20} />
        </div>
        <div className="brand-info">
          <span className="brand-title">OIL SENTRY</span>
          <span className="brand-subtitle">INTELLIGENCE</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div>
          <div className="nav-section-title">OPERATIONS</div>
          <div className="nav-group">
            <NavLink
              to="/app"
              end
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Activity size={16} />
              <span>Overview</span>
            </NavLink>

            <NavLink
              to="/app/wells"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Layers size={16} />
              <span>Wells</span>
            </NavLink>

            <NavLink
              to="/app/map"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <MapPin size={16} />
              <span>Field Map</span>
            </NavLink>

            <NavLink
              to="/app/live"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Radio size={16} />
              <span>Live Operations</span>
            </NavLink>
          </div>
        </div>

        <div>
          <div className="nav-section-title">INTELLIGENCE</div>
          <div className="nav-group">
            <NavLink
              to="/app/intelligence"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Brain size={16} />
              <span>Intelligence</span>
            </NavLink>

            <NavLink
              to="/app/events"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <AlertOctagon size={16} />
              <span>Events</span>
            </NavLink>

            <NavLink
              to="/app/reports"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <FileText size={16} />
              <span>Reports</span>
            </NavLink>
          </div>
        </div>

        <div>
          <div className="nav-section-title">SYSTEM</div>
          <div className="nav-group">
            <NavLink
              to="/app/system"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Server size={16} />
              <span>System Status</span>
            </NavLink>
          </div>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="status-pill">
          <span className={`status-dot ${apiConnected ? "" : "offline"}`} />
          <span className="font-mono" style={{ fontSize: 11, letterSpacing: "0.04em" }}>
            SYSTEM OPERATIONAL
          </span>
        </div>
        <div className="status-pill" style={{ color: "var(--text-muted)" }}>
          <span className={`status-dot ${apiConnected ? "" : "offline"}`} />
          <span className="font-mono" style={{ fontSize: 11, letterSpacing: "0.04em" }}>
            {apiConnected ? "API CONNECTED" : "API DISCONNECTED"}
          </span>
        </div>

        <Link to="/" className="sidebar-landing-link">
          <span>Landing Overview</span>
          <ArrowUpRight size={12} />
        </Link>
      </div>
    </aside>
  );
}
