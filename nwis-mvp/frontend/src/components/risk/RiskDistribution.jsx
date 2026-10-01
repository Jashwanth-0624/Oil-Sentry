import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const RISK_COLORS = {
  NORMAL: "#10b981",
  STUCK_PIPE: "#ef4444",
  MUD_LOSS: "#f59e0b",
  HIGH_TORQUE: "#8b5cf6",
};

export default function RiskDistribution({ probabilities = {} }) {
  if (!probabilities || Object.keys(probabilities).length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", padding: "16px 0" }}>
        No risk probability distribution available.
      </div>
    );
  }

  const data = Object.entries(probabilities).map(([key, val]) => ({
    name: key.replace("_", " "),
    code: key,
    probability: Math.round(val * 1000) / 10, // e.g. 95.2%
    raw: val,
  }));

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(val) => `${val}%`}
            stroke="#475569"
            tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "var(--font-mono)" }}
          />
          <YAxis
            dataKey="name"
            type="category"
            stroke="#475569"
            tick={{ fill: "#cbd5e1", fontSize: 12, fontWeight: 500 }}
            width={100}
          />
          <Tooltip
            formatter={(value) => [`${value}%`, "Confidence"]}
            contentStyle={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
            }}
          />
          <Bar dataKey="probability" radius={[0, 4, 4, 0]} barSize={18}>
            {data.map((entry) => (
              <Cell
                key={entry.code}
                fill={RISK_COLORS[entry.code] || "var(--accent-amber)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
