"""Tests for instance_settings acceptance storage (AIA-014)."""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src", "api"))

from instance_settings import (
    append_acceptance,
    get_effective_notice,
    get_latest_acceptance,
    load_instance_settings,
)


def test_get_effective_notice_merges_config_and_defaults(tmp_path: Path):
    pvc = tmp_path / "shared"
    pvc.mkdir()
    cfg = tmp_path / "config.json"
    cfg.write_text(
        json.dumps(
            {"notice": {"document_version": "2.0", "effective_date": "2026-01-01"}}
        ),
        encoding="utf-8",
    )
    notice = get_effective_notice(pvc, cfg)
    assert notice["document_version"] == "2.0"
    assert notice["effective_date"] == "2026-01-01"


def test_append_and_get_latest_acceptance(tmp_path: Path):
    pvc = tmp_path / "shared"
    pvc.mkdir()
    append_acceptance(
        pvc,
        {"user": "alice", "email": "a@example.com", "document_version": "1.0"},
    )
    rec = get_latest_acceptance(pvc, "alice", "1.0")
    assert rec is not None
    assert rec["user"] == "alice"
    assert rec["document_version"] == "1.0"
    assert get_latest_acceptance(pvc, "alice", "2.0") is None


def test_load_instance_settings_defaults(tmp_path: Path):
    pvc = tmp_path / "shared"
    pvc.mkdir()
    s = load_instance_settings(pvc)
    assert s["notice"]["document_version"] == "2.0"
