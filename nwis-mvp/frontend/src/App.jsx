import React from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import AppShell from "./components/layout/AppShell";
import Overview from "./pages/Overview";
import WellsRegistry from "./pages/WellsRegistry";
import WellDetails from "./pages/WellDetails";
import LiveOperations from "./pages/LiveOperations";
import IntelligenceCenter from "./pages/IntelligenceCenter";
import EventsExplorer from "./pages/EventsExplorer";
import Reports from "./pages/Reports";
import SystemStatus from "./pages/SystemStatus";
import MapPage from "./pages/MapPage";

function RedirectToAppWell() {
  const { wellId } = useParams();
  return <Navigate to={`/app/wells/${wellId}`} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Internal NWIS Operations Platform */}
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Overview />} />
        <Route path="wells" element={<WellsRegistry />} />
        <Route path="wells/:wellId" element={<WellDetails />} />
        <Route path="map" element={<MapPage />} />
        <Route path="live" element={<LiveOperations />} />
        <Route path="intelligence" element={<IntelligenceCenter />} />
        <Route path="events" element={<EventsExplorer />} />
        <Route path="reports" element={<Reports />} />
        <Route path="system" element={<SystemStatus />} />
      </Route>

      {/* Backward-compatibility redirects for root-level routes */}
      <Route path="/wells" element={<Navigate to="/app/wells" replace />} />
      <Route path="/wells/:wellId" element={<RedirectToAppWell />} />
      <Route path="/map" element={<Navigate to="/app/map" replace />} />
      <Route path="/live" element={<Navigate to="/app/live" replace />} />
      <Route path="/intelligence" element={<Navigate to="/app/intelligence" replace />} />
      <Route path="/events" element={<Navigate to="/app/events" replace />} />
      <Route path="/reports" element={<Navigate to="/app/reports" replace />} />
      <Route path="/system" element={<Navigate to="/app/system" replace />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
