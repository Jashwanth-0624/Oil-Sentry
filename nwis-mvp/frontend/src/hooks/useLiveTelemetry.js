/**
 * Custom React hook for live 1 Hz synthetic drilling telemetry WebSocket stream.
 */

import { useState, useEffect, useRef, useCallback } from "react";

export function getWebSocketUrl() {
  const customWs = import.meta.env.VITE_WS_URL;
  if (customWs) return customWs;

  const apiUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl.replace(/^http/, "ws") + "/ws/live";
  }

  if (typeof window !== "undefined" && window.location) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    if (
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      return `${protocol}//${window.location.host}/ws/live`;
    }
    return `${protocol}//127.0.0.1:8000/ws/live`;
  }

  return "ws://127.0.0.1:8000/ws/live";
}

export function useLiveTelemetry({
  initialWellId = "W001",
  initialScenario = "automatic",
  maxHistory = 60,
  autoConnect = true,
} = {}) {
  const [connectionState, setConnectionState] = useState("DISCONNECTED");
  const [currentTelemetry, setCurrentTelemetry] = useState(null);
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [riskHistory, setRiskHistory] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeScenario, setActiveScenario] = useState(initialScenario);
  const [activeWellId, setActiveWellId] = useState(initialWellId);
  const [activeAlert, setActiveAlert] = useState(null);
  const [alertHistory, setAlertHistory] = useState([]);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const intentionalCloseRef = useRef(false);
  const activeWellIdRef = useRef(activeWellId);
  const activeScenarioRef = useRef(activeScenario);

  // Keep refs in sync
  activeWellIdRef.current = activeWellId;
  activeScenarioRef.current = activeScenario;

  const connect = useCallback(() => {
    // Clean up any existing connection
    if (socketRef.current) {
      intentionalCloseRef.current = true;
      try {
        socketRef.current.close();
      } catch (e) {
        // ignore
      }
      socketRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const wsUrl = getWebSocketUrl();
    intentionalCloseRef.current = false;
    setConnectionState((prev) => (reconnectAttemptsRef.current > 0 ? "RECONNECTING" : "CONNECTING"));
    setError(null);

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (socketRef.current !== ws) return; // Stale socket
        reconnectAttemptsRef.current = 0;
        setConnectionState("LIVE");
        setIsStreaming(true);

        // Send start streaming message for active well and scenario
        ws.send(
          JSON.stringify({
            type: "start",
            well_id: activeWellIdRef.current,
            scenario: activeScenarioRef.current,
          })
        );
      };

      ws.onmessage = (event) => {
        if (socketRef.current !== ws) return; // Stale socket
        try {
          const data = JSON.parse(event.data);

          if (data.type === "telemetry") {
            setCurrentTelemetry(data);
            setIsStreaming(true);

            // Append to bounded telemetry history for charts
            setTelemetryHistory((prev) => {
              const updated = [...prev, data];
              return updated.length > maxHistory ? updated.slice(updated.length - maxHistory) : updated;
            });

            // If risk prediction is attached, record in bounded risk history
            if (data.risk) {
              setRiskHistory((prev) => {
                const item = {
                  timestamp: data.timestamp,
                  label: data.risk.label,
                  class_id: data.risk.class_id,
                  probability: data.risk.probability,
                  depth: data.depth,
                };
                const updated = [item, ...prev];
                return updated.length > 30 ? updated.slice(0, 30) : updated;
              });
            }
          } else if (data.type === "alert") {
            setActiveAlert(data);
            setAlertHistory((prev) => {
              const updated = [data, ...prev.filter((a) => a.alert_id !== data.alert_id)];
              return updated.slice(0, 30);
            });
          } else if (data.type === "alert_recovery") {
            setActiveAlert((prev) => (prev && prev.alert_id === data.alert_id ? { ...prev, ...data } : data));
            setAlertHistory((prev) =>
              prev.map((a) =>
                a.alert_id === data.alert_id ? { ...a, status: "RECOVERED", recovery_time: data.timestamp } : a
              )
            );
          } else if (data.type === "status") {
            if (data.status === "paused") {
              setIsStreaming(false);
            } else if (data.status === "streaming") {
              setIsStreaming(true);
            }
            if (data.scenario) {
              setActiveScenario(data.scenario);
            }
          } else if (data.type === "error") {
            setError(data.message || "WebSocket error received from server.");
          }
        } catch (err) {
          console.warn("Failed to parse WebSocket message:", err);
        }
      };


      ws.onerror = (errEvent) => {
        if (socketRef.current !== ws) return; // Stale socket
        console.warn("WebSocket transport error:", errEvent);
        setError("WebSocket connection failed. Backend server may be offline.");
        setConnectionState("ERROR");
      };

      ws.onclose = () => {
        if (socketRef.current !== ws) return; // Stale socket
        setIsStreaming(false);
        if (!intentionalCloseRef.current) {
          // Attempt exponential backoff reconnect
          setConnectionState("RECONNECTING");
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setConnectionState("DISCONNECTED");
        }
      };
    } catch (err) {
      console.error("Failed to construct WebSocket:", err);
      setConnectionState("ERROR");
      setError(err.message);
    }
  }, [maxHistory]);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setConnectionState("DISCONNECTED");
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(
    (wellId = activeWellId, scenario = activeScenario) => {
      setActiveWellId(wellId);
      setActiveScenario(scenario);

      if (
        !socketRef.current ||
        socketRef.current.readyState === WebSocket.CLOSED ||
        socketRef.current.readyState === WebSocket.CLOSING
      ) {
        connect();
      } else if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: "start",
            well_id: wellId,
            scenario,
          })
        );
        setIsStreaming(true);
      }
    },
    [activeWellId, activeScenario, connect]
  );

  const pauseStream = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "stop" }));
      setIsStreaming(false);
    }
  }, []);

  const changeWell = useCallback(
    (newWellId) => {
      setActiveWellId(newWellId);
      setActiveAlert(null);
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: "start",
            well_id: newWellId,
            scenario: activeScenarioRef.current,
          })
        );
      }
    },
    []
  );

  const changeScenario = useCallback(
    (newScenario) => {
      setActiveScenario(newScenario);
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: "set_scenario",
            scenario: newScenario,
          })
        );
      }
    },
    []
  );

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    connectionState,
    currentTelemetry,
    telemetryHistory,
    riskHistory,
    isStreaming,
    activeScenario,
    activeWellId,
    activeAlert,
    alertHistory,
    dismissActiveAlert: () => setActiveAlert(null),
    error,
    startStream,
    pauseStream,
    changeWell,
    changeScenario,
    reconnect: connect,
    disconnect,
  };
}


export default useLiveTelemetry;
