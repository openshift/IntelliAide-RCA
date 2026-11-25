"""Shared content registry — JSON files under ``content/`` at the repo root.

Industry-standard pattern: user-visible copy and stable domain constants (RCA
tier ids, filenames, labels) live in versioned JSON consumed by both Python and
React so nothing drifts between layers.

Usage::

    from utils.content import notices, rca_stages
    from utils.content import STAGE_FILE_KEY, STAGE_API_TO_RESULT_FILE

    notices.export_disclaimer.body
    STAGE_API_TO_RESULT_FILE["Tier_1"]  # -> RCA_Tier1.txt
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class _DotDict:
    """Lightweight read-only wrapper that exposes dict keys as attributes."""

    def __init__(self, data: dict[str, Any]) -> None:
        for key, value in data.items():
            object.__setattr__(self, key, _wrap(value))

    def __getitem__(self, key: str) -> Any:
        return getattr(self, key)

    def get(self, key: str, default: Any = None) -> Any:
        return getattr(self, key, default)

    def __repr__(self) -> str:
        attrs = {k: v for k, v in self.__dict__.items() if not k.startswith("_")}
        return f"_DotDict({attrs})"


def _wrap(data: Any) -> Any:
    if isinstance(data, dict):
        return _DotDict(data)
    if isinstance(data, list):
        return [_wrap(item) for item in data]
    return data


def _content_dir() -> Path:
    here = Path(__file__).resolve().parent
    return here.parent.parent.parent / "content"


def load_content_file(name: str) -> _DotDict:
    """Load ``content/{name}.json`` and return a nested _DotDict."""
    path = _content_dir() / f"{name}.json"
    if not path.exists():
        raise FileNotFoundError(
            f"content/{name}.json not found at {path}. "
            "Add the file or fix the content registry path."
        )
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return _wrap(data)


def _priority_bucket_maps(pb: _DotDict) -> tuple[dict[str, str], dict[str, str]]:
    file_key: dict[str, str] = {}
    display: dict[str, str] = {}
    for key in ("high", "medium", "low", "reselect"):
        bucket = pb.get(key)
        if bucket is None:
            continue
        file_key[key] = bucket.file_key
        display[key] = bucket.display
    return file_key, display


def _stage_api_to_result_file(stages: list[Any]) -> dict[str, str]:
    return {s.id: s.result_filename for s in stages}


def _stage_export_pairs(stages: list[Any]) -> list[tuple[str, str]]:
    return [(s.result_filename, s.export_pdf_filename) for s in stages]


def _stage_cost_label_pairs(stages: list[Any]) -> list[tuple[str, str]]:
    return [(s.cost_analytics_key, s.label) for s in stages]


def _analytics_priority_labels(stages_chart: list[Any]) -> list[str]:
    return [row.name for row in stages_chart]


notices: _DotDict = load_content_file("notices")
rca_stages: _DotDict = load_content_file("rca_stages")

STAGE_FILE_KEY, STAGE_DISPLAY = _priority_bucket_maps(rca_stages.priority_bucket)
STAGE_API_TO_RESULT_FILE = _stage_api_to_result_file(rca_stages.stages)
RCA_STAGE_EXPORT_PAIRS = _stage_export_pairs(rca_stages.stages)
RCA_COST_ANALYTICS_LABELS = _stage_cost_label_pairs(rca_stages.stages)
RCA_ANALYTICS_PRIORITY_LABELS = _analytics_priority_labels(
    rca_stages.analytics.file_priority_chart
)
RCA_VALID_API_STAGE_IDS = tuple(STAGE_API_TO_RESULT_FILE.keys())
