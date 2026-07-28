import os
import json
import logging
import yaml


def load_config(path: str = "config/config.yaml") -> dict:
    with open(path, "r") as f:
        return yaml.safe_load(f)


def setup_logging(cfg: dict):
    log_dir = cfg["logging"]["log_dir"]
    os.makedirs(log_dir, exist_ok=True)
    level = getattr(logging, cfg["logging"].get("level", "INFO").upper())

    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        handlers=[
            logging.FileHandler(os.path.join(log_dir, "ingestion.log")),
            logging.StreamHandler(),
        ],
    )


class ProcessedIdStore:
    """Persists processed Gmail message IDs to a JSON file on disk."""

    def __init__(self, path: str):
        self.path = path
        os.makedirs(os.path.dirname(path), exist_ok=True)
        self._ids = self._load()

    def _load(self) -> set:
        if os.path.exists(self.path):
            with open(self.path, "r") as f:
                try:
                    return set(json.load(f))
                except json.JSONDecodeError:
                    return set()
        return set()

    def has(self, message_id: str) -> bool:
        return message_id in self._ids

    def add(self, message_id: str):
        self._ids.add(message_id)

    def save(self):
        with open(self.path, "w") as f:
            json.dump(sorted(self._ids), f, indent=2)
