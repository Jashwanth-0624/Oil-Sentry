import { useEffect, useState } from "react";
import { connectWebSocket } from "../services/websocket";

export function useWebSocket() {
	const [message, setMessage] = useState(null);

	useEffect(() => {
		const socket = connectWebSocket();
		socket.onmessage = (event) => setMessage(JSON.parse(event.data));
		return () => socket.close();
	}, []);

	return message;
}
