"""Synthetic drilling telemetry simulator for 1 Hz real-time streaming."""

from __future__ import annotations

import logging
import random
from datetime import datetime, timezone
from typing import Any

from app.services.risk_service import predict_drilling_risk

logger = logging.getLogger(__name__)

# Characteristic baseline targets for synthetic simulation scenarios
SCENARIO_TARGETS: dict[str, dict[str, float]] = {
    "normal": {
        "rop": 22.5,
        "wob": 13.0,
        "rpm": 115.0,
        "torque": 17.0,
        "standpipe_pressure": 2650.0,
        "mud_density": 1.155,
    },
    "high_torque": {
        "rop": 13.5,
        "wob": 16.0,
        "rpm": 108.0,
        "torque": 34.5,
        "standpipe_pressure": 2720.0,
        "mud_density": 1.155,
    },
    "mud_loss": {
        "rop": 18.0,
        "wob": 12.0,
        "rpm": 114.0,
        "torque": 15.2,
        "standpipe_pressure": 1380.0,
        "mud_density": 1.050,
    },
    "stuck_pipe": {
        "rop": 3.2,
        "wob": 19.0,
        "rpm": 82.0,
        "torque": 41.5,
        "standpipe_pressure": 3280.0,
        "mud_density": 1.210,
    },
}


class TelemetrySimulator:
    """Produces smooth, realistic sequential drilling dynamics telemetry at ~1 Hz."""

    def __init__(
        self,
        well_id: str = "W001",
        initial_depth: float = 3500.0,
        scenario: str = "automatic",
    ) -> None:
        self.well_id = well_id
        self.depth = float(initial_depth)
        self.scenario = scenario.lower()

        # Initialize current sensor channels to normal baseline
        base = SCENARIO_TARGETS["normal"]
        self.rop = base["rop"]
        self.wob = base["wob"]
        self.rpm = base["rpm"]
        self.torque = base["torque"]
        self.standpipe_pressure = base["standpipe_pressure"]
        self.mud_density = base["mud_density"]

        self.tick_count = 0

    def set_scenario(self, scenario: str) -> None:
        valid_scenarios = {"automatic", "normal", "high_torque", "mud_loss", "stuck_pipe"}
        cleaned = scenario.strip().lower()
        if cleaned in valid_scenarios:
            self.scenario = cleaned

    def set_well(self, well_id: str, depth: float | None = None) -> None:
        self.well_id = well_id
        if depth is not None and depth > 0:
            self.depth = float(depth)

    def _resolve_active_targets(self) -> dict[str, float]:
        """Determine target drilling parameters based on current scenario or automatic cycle."""
        if self.scenario != "automatic":
            return SCENARIO_TARGETS.get(self.scenario, SCENARIO_TARGETS["normal"])

        # Automatic cyclical scenario over a 100-tick period (~100 seconds)
        cycle_tick = self.tick_count % 100

        if cycle_tick < 25:
            # Phase 1: Steady normal drilling
            return SCENARIO_TARGETS["normal"]
        elif cycle_tick < 38:
            # Phase 2: High torque anomaly develops
            return SCENARIO_TARGETS["high_torque"]
        elif cycle_tick < 48:
            # Phase 3: Mitigation / Recovery back to normal
            return SCENARIO_TARGETS["normal"]
        elif cycle_tick < 72:
            # Phase 4: Normal drilling in permeable sandstone
            return SCENARIO_TARGETS["normal"]
        elif cycle_tick < 85:
            # Phase 5: Mud loss fracture event
            return SCENARIO_TARGETS["mud_loss"]
        else:
            # Phase 6: Pill placement & pressure stabilization
            return SCENARIO_TARGETS["normal"]

    def _step_physics(self) -> None:
        """Evolve sensor parameters smoothly toward active targets with realistic noise."""
        targets = self._resolve_active_targets()
        smooth_rate = 0.25  # Inertia / response rate per second

        # Smooth exponential moving adjustment toward target
        self.rop += (targets["rop"] - self.rop) * smooth_rate
        self.wob += (targets["wob"] - self.wob) * smooth_rate
        self.rpm += (targets["rpm"] - self.rpm) * smooth_rate
        self.torque += (targets["torque"] - self.torque) * smooth_rate
        self.standpipe_pressure += (targets["standpipe_pressure"] - self.standpipe_pressure) * smooth_rate
        self.mud_density += (targets["mud_density"] - self.mud_density) * smooth_rate

        # Subtle realistic Gaussian sensor jitter
        jitter_rop = random.uniform(-0.25, 0.25)
        jitter_wob = random.uniform(-0.15, 0.15)
        jitter_rpm = random.uniform(-0.5, 0.5)
        jitter_torque = random.uniform(-0.35, 0.35)
        jitter_spp = random.uniform(-12.0, 12.0)
        jitter_mud = random.uniform(-0.002, 0.002)

        self.rop = max(1.0, self.rop + jitter_rop)
        self.wob = max(2.0, self.wob + jitter_wob)
        self.rpm = max(30.0, self.rpm + jitter_rpm)
        self.torque = max(5.0, self.torque + jitter_torque)
        self.standpipe_pressure = max(500.0, self.standpipe_pressure + jitter_spp)
        self.mud_density = max(0.90, self.mud_density + jitter_mud)

        # Depth increments by ROP / 3600 (meters per second)
        depth_increment = self.rop / 3600.0
        self.depth += depth_increment
        self.tick_count += 1

    def next_frame(self) -> dict[str, Any]:
        """Generate next 1 Hz telemetry frame with real XGBoost risk inference."""
        self._step_physics()

        timestamp = datetime.now(timezone.utc).isoformat()

        # Build feature dictionary matching XGBoost expectations exactly
        features = {
            "depth": float(round(self.depth, 2)),
            "rop": float(round(self.rop, 2)),
            "wob": float(round(self.wob, 2)),
            "rpm": float(round(self.rpm, 1)),
            "torque": float(round(self.torque, 2)),
            "standpipe_pressure": float(round(self.standpipe_pressure, 1)),
            "mud_density": float(round(self.mud_density, 3)),
        }

        # Run real-time risk inference via existing XGBoost service
        risk_summary: dict[str, Any] | None = None
        try:
            prediction = predict_drilling_risk(features)
            risk_summary = {
                "label": prediction["predicted_label"],
                "class_id": prediction["predicted_class"],
                "probability": round(prediction["risk_summary"]["risk_probability"], 4),
                "probabilities": {
                    k: round(v, 4) for k, v in prediction["probabilities"].items()
                },
            }
        except Exception as exc:
            logger.warning("Live risk inference fallback for frame %s: %s", self.tick_count, exc)
            risk_summary = None

        return {
            "type": "telemetry",
            "timestamp": timestamp,
            "well_id": self.well_id,
            "depth": features["depth"],
            "rop": features["rop"],
            "wob": features["wob"],
            "rpm": features["rpm"],
            "torque": features["torque"],
            "standpipe_pressure": features["standpipe_pressure"],
            "mud_density": features["mud_density"],
            "scenario": self.scenario,
            "risk": risk_summary,
        }
