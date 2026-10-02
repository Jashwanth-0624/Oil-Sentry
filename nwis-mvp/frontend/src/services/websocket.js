import { getWebSocketUrl } from "../hooks/useLiveTelemetry";
export function connectWebSocket() {
	return new WebSocket(getWebSocketUrl());
}
