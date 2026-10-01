import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { checkHealth } from "../../services/api";

export default function AppShell() {
  const [apiConnected, setApiConnected] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function verifyBackend() {
      try {
        await checkHealth();
        if (mounted) setApiConnected(true);
      } catch (err) {
        if (mounted) setApiConnected(false);
      }
    }

    verifyBackend();
    const interval = setInterval(verifyBackend, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="app-shell">
      <Sidebar apiConnected={apiConnected} />
      <div className="main-wrapper">
        <Topbar apiConnected={apiConnected} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
