import React from "react";
import { Loader2 } from "lucide-react";

export default function LoadingState({ message = "Loading operations data..." }) {
  return (
    <div className="state-container">
      <div className="spinner" />
      <div className="state-title">{message}</div>
      <div className="state-desc">Querying eRTMAC-NWIS database and model services...</div>
    </div>
  );
}
