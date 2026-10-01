export function connectWebSocket() {
	const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
	return new WebSocket(apiUrl.replace(/^http/, "ws") + "/ws");
}
