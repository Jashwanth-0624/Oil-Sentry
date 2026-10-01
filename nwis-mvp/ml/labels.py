"""Central event-label mapping for the drilling risk model."""

from typing import Mapping

EVENT_LABEL_TO_NAME: dict[int, str] = {
    0: "NORMAL",
    1: "STUCK_PIPE",
    2: "MUD_LOSS",
    3: "HIGH_TORQUE",
}

EVENT_NAME_TO_LABEL: dict[str, int] = {
    name: label for label, name in EVENT_LABEL_TO_NAME.items()
}

CLASS_ORDER: tuple[int, ...] = (0, 1, 2, 3)
CLASS_NAMES: tuple[str, ...] = tuple(EVENT_LABEL_TO_NAME[label] for label in CLASS_ORDER)


def label_name(event_label: int) -> str:
    try:
        return EVENT_LABEL_TO_NAME[int(event_label)]
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError(f"Unknown event_label: {event_label}") from exc


def label_id(event_name: str) -> int:
    try:
        return EVENT_NAME_TO_LABEL[str(event_name)]
    except KeyError as exc:
        raise ValueError(f"Unknown event name: {event_name}") from exc


def probabilities_by_name(class_ids: Mapping[int, float]) -> dict[str, float]:
    return {EVENT_LABEL_TO_NAME[class_id]: float(class_ids[class_id]) for class_id in CLASS_ORDER}
