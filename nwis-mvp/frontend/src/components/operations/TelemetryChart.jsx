import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function TelemetryChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", padding: "32px 0", textAlign: "center" }}>
        No telemetry stream data available to plot.
      </div>
    );
  }

  // Format chart data
  const chartData = data.map((item, idx) => ({
    time: item.timestamp
      ? new Date(item.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : `#${idx + 1}`,
    depth: item.depth,
    rop: item.rop,
    torque: item.torque,
    spp: item.standpipe_pressure ? item.standpipe_pressure / 100 : undefined, // scaled for chart
    wob: item.wob,
    rpm: item.rpm,
  }));

  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="time"
            stroke="#475569"
            tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "var(--font-mono)" }}
          />
          <YAxis
            stroke="#475569"
            tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "var(--font-mono)" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
          />
          <Legend
            wrapperStyle={{
              paddingTop: 10,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
            }}
          />
          <Line
            type="monotone"
            dataKey="rop"
            name="ROP (m/hr)"
            stroke="#10b981"
            dot={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="torque"
            name="Torque (kN·m)"
            stroke="#f59e0b"
            dot={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="wob"
            name="WOB (klbf)"
            stroke="#38bdf8"
            dot={false}
            strokeWidth={1.5}
          />
          <Line
            type="monotone"
            dataKey="spp"
            name="SPP (psi/100)"
            stroke="#ec4899"
            dot={false}
            strokeWidth={1.5}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
