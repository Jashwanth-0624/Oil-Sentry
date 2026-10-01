import React from "react";
import { Database } from "lucide-react";

export default function EmptyState({
  title = "No records found",
  message = "No matching historical or operational records match your query filters.",
  icon: Icon = Database,
}) {
  return (
    <div className="state-container">
      <Icon className="state-icon" />
      <div className="state-title">{title}</div>
      <div className="state-desc">{message}</div>
    </div>
  );
}
