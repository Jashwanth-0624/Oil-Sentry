"""FastAPI WebSocket endpoint for live 1 Hz synthetic drilling telemetry."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.well import Well
from app.services.alert_service import AlertEngine
from app.services.telemetry_simulator import TelemetrySimulator

logger = logging.getLogger(__name__)

router = APIRouter(tags=["telemetry"])


def _validate_well_id(well_id: str) -> tuple[bool, float | None]:
    """Validate that well_id exists in the database and retrieve its total depth."""
    db: Session = SessionLocal()
    try:
        well = db.query(Well).filter(Well.well_id == well_id).first()
        if well:
            return True, well.total_depth
        return False, None
    finally:
        db.close()


@router.websocket("/ws/live")
async def live_telemetry_websocket(websocket: WebSocket) -> None:
    """Stream 1 Hz simulated drilling telemetry and real-time XGBoost risk predictions."""
    await websocket.accept()

    default_well = "W001"
    _, depth = _validate_well_id(default_well)
    simulator = TelemetrySimulator(
        well_id=default_well,
        initial_depth=depth or 3500.0,
        scenario="automatic",
    )
    alert_engine = AlertEngine()

    streaming = True
    stream_task: asyncio.Task | None = None

    # Send initial handshake message
    await websocket.send_json(
        {
            "type": "connected",
            "message": "Drilling telemetry WebSocket stream connected",
            "well_id": default_well,
            "status": "ready",
            "frequency_hz": 1.0,
        }
    )

    async def _telemetry_publisher() -> None:
        """Background loop pushing 1 telemetry frame per second and operational alerts."""
        try:
            while True:
                if streaming:
                    frame = simulator.next_frame()
                    await websocket.send_json(frame)

                    # Evaluate frame for sustained operational alert triggering / recovery
                    alert_event = alert_engine.process_telemetry_frame(
                        frame=frame,
                        scenario=simulator.scenario,
                    )
                    if alert_event:
                        await websocket.send_json(alert_event)

                await asyncio.sleep(1.0)
        except asyncio.CancelledError:
            logger.debug("Telemetry stream task cancelled for connection.")
        except Exception as exc:
            logger.warning("Error inside telemetry stream loop: %s", exc)

    # Launch publisher task
    stream_task = asyncio.create_task(_telemetry_publisher())

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json(
                    {
                        "type": "error",
                        "code": "INVALID_JSON",
                        "message": "Received malformed JSON message.",
                    }
                )
                continue

            msg_type = data.get("type", "").lower()

            if msg_type == "start":
                req_well = data.get("well_id")
                if req_well:
                    valid, well_depth = _validate_well_id(req_well)
                    if not valid:
                        await websocket.send_json(
                            {
                                "type": "error",
                                "code": "INVALID_WELL",
                                "message": f"Well '{req_well}' not found in database.",
                            }
                        )
                        continue
                    if req_well != simulator.well_id:
                        alert_engine.reset_state()
                    simulator.set_well(req_well, well_depth)

                req_scenario = data.get("scenario")
                if req_scenario:
                    simulator.set_scenario(req_scenario)

                streaming = True
                await websocket.send_json(
                    {
                        "type": "status",
                        "status": "streaming",
                        "well_id": simulator.well_id,
                        "scenario": simulator.scenario,
                    }
                )

            elif msg_type == "stop" or msg_type == "pause":
                streaming = False
                await websocket.send_json(
                    {
                        "type": "status",
                        "status": "paused",
                        "well_id": simulator.well_id,
                    }
                )

            elif msg_type == "set_scenario":
                req_scenario = data.get("scenario", "")
                simulator.set_scenario(req_scenario)
                await websocket.send_json(
                    {
                        "type": "status",
                        "status": "scenario_updated",
                        "scenario": simulator.scenario,
                    }
                )

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            else:
                await websocket.send_json(
                    {
                        "type": "error",
                        "code": "UNKNOWN_MESSAGE_TYPE",
                        "message": f"Unsupported message type: '{msg_type}'",
                    }
                )

    except WebSocketDisconnect:
        logger.info("Client disconnected from /ws/live.")
    except Exception as exc:
        logger.warning("WebSocket connection exception: %s", exc)
    finally:
        # Guarantee task cancellation on exit to prevent orphaned background loops
        if stream_task and not stream_task.done():
            stream_task.cancel()
            try:
                await stream_task
            except asyncio.CancelledError:
                pass
