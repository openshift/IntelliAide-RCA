"""
Instance-level settings, user acceptance records, and admin configuration.

Storage layout (under shared PVC):
    _instance/settings.json        – notice version, effective date, custom body
    _instance/acceptances.jsonl    – one JSON line per acceptance event
    _instance/admin_config.json    – admin-provided LLM + Hydra credentials
"""

import copy
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_INSTANCE_DIR_NAME = "_instance"
_SETTINGS_FILE = "settings.json"
_ACCEPTANCES_FILE = "acceptances.jsonl"
_ADMIN_CONFIG_FILE = "admin_config.json"

_DEFAULT_SETTINGS: dict[str, Any] = {
    "notice": {
        "document_version": "2.0",
        "effective_date": "2026-11-05",
        "document_body_md": "",
    },
}


def _instance_dir(shared_pvc: Path) -> Path:
    d = shared_pvc / _INSTANCE_DIR_NAME
    d.mkdir(parents=True, exist_ok=True)
    return d


# ---- settings.json --------------------------------------------------------


def load_instance_settings(shared_pvc: Path) -> dict[str, Any]:
    """Return instance settings, falling back to defaults."""
    path = _instance_dir(shared_pvc) / _SETTINGS_FILE
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            merged = dict(_DEFAULT_SETTINGS)
            merged.update(data)
            if "notice" in data:
                merged["notice"] = {**_DEFAULT_SETTINGS["notice"], **data["notice"]}
            return merged
        except Exception:
            logger.warning("Corrupt instance settings; using defaults")
    return dict(_DEFAULT_SETTINGS)


def get_effective_notice(
    shared_pvc: Path,
    config_path: Path | None = None,
) -> dict[str, Any]:
    """Notice metadata: defaults < config.json < _instance/settings.json."""
    notice: dict[str, Any] = dict(_DEFAULT_SETTINGS["notice"])
    if config_path and config_path.exists():
        try:
            cfg = json.loads(config_path.read_text(encoding="utf-8"))
            notice.update(cfg.get("notice") or {})
        except Exception:
            logger.warning("Could not read notice from %s", config_path)
    settings_path = _instance_dir(shared_pvc) / _SETTINGS_FILE
    if settings_path.exists():
        try:
            data = json.loads(settings_path.read_text(encoding="utf-8"))
            notice.update(data.get("notice") or {})
        except Exception:
            logger.warning("Corrupt instance settings notice section")
    return notice


def save_instance_settings(shared_pvc: Path, data: dict[str, Any]) -> None:
    """Persist instance settings."""
    path = _instance_dir(shared_pvc) / _SETTINGS_FILE
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


# ---- acceptances.jsonl ----------------------------------------------------


def get_latest_acceptance(
    shared_pvc: Path,
    user: str,
    document_version: str | None = None,
    email: str | None = None,
) -> dict[str, Any] | None:
    """Return the user's most recent acceptance record, optionally filtered
    to a specific document_version.

    Matches on ``user`` (SSO username) OR ``email`` so records are found
    regardless of which identifier the OAuth proxy forwards.
    Returns ``None`` if none found.
    """
    path = _instance_dir(shared_pvc) / _ACCEPTANCES_FILE
    if not path.exists():
        return None

    user_lower = user.lower() if user else ""
    email_lower = email.lower() if email else ""

    latest: dict[str, Any] | None = None
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            continue
        rec_user = rec.get("user", "").lower()
        rec_email = rec.get("email", "").lower()
        rec_sso = rec.get("sso_username", "").lower()
        if not (
            (user_lower and (rec_user == user_lower or rec_sso == user_lower))
            or (email_lower and rec_email == email_lower)
        ):
            continue
        if document_version and rec.get("document_version") != document_version:
            continue
        if latest is None or rec.get("timestamp", "") > latest.get("timestamp", ""):
            latest = rec
    return latest


def append_acceptance(shared_pvc: Path, record: dict[str, Any]) -> None:
    """Append one acceptance record to the JSONL file."""
    path = _instance_dir(shared_pvc) / _ACCEPTANCES_FILE
    record.setdefault("timestamp", datetime.now(timezone.utc).isoformat())
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, separators=(",", ":")) + "\n")


# ---- admin_config.json (LLM + Hydra credentials) -------------------------

_ADMIN_ALLOWED_KEYS = {"claude", "hydra"}


def save_admin_config(shared_pvc: Path, data: dict[str, Any]) -> None:
    """Persist admin-provided LLM + Hydra config.

    Accepts data with ``llm`` key (user-facing name) and translates it to
    ``claude`` internally.  Only ``claude`` and ``hydra`` keys are written;
    any other top-level keys are silently stripped.
    """
    cleaned: dict[str, Any] = {}
    if "llm" in data:
        cleaned["claude"] = data["llm"]
    if "claude" in data and "llm" not in data:
        cleaned["claude"] = data["claude"]
    if "hydra" in data:
        cleaned["hydra"] = data["hydra"]

    path = _instance_dir(shared_pvc) / _ADMIN_CONFIG_FILE
    path.write_text(json.dumps(cleaned, indent=2), encoding="utf-8")
    logger.info("Admin config saved to %s", path)


def load_admin_config(shared_pvc: Path) -> dict[str, Any]:
    """Read admin config from PVC (internal format with ``claude`` key).

    Returns an empty dict if the file does not exist or is corrupt.
    """
    path = _instance_dir(shared_pvc) / _ADMIN_CONFIG_FILE
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        logger.warning("Corrupt admin config at %s; returning empty", path)
        return {}


def load_admin_config_for_display(shared_pvc: Path) -> dict[str, Any]:
    """Read admin config, translating ``claude`` -> ``llm`` for UI display."""
    raw = load_admin_config(shared_pvc)
    display: dict[str, Any] = {}
    if "claude" in raw:
        display["llm"] = raw["claude"]
    if "hydra" in raw:
        display["hydra"] = raw["hydra"]
    return display


def is_system_configured(shared_pvc: Path) -> tuple[bool, list[str]]:
    """Check whether admin has provided valid LLM credentials.

    Returns ``(configured, missing)`` where *missing* lists the absent
    credential fields.
    """
    cfg = load_admin_config(shared_pvc)
    claude = cfg.get("claude", {})
    if not isinstance(claude, dict):
        return False, ["llm (entire section)"]

    missing: list[str] = []

    auth_type = (claude.get("auth_type") or "").strip()
    if not auth_type:
        missing.append("llm.auth_type")

    if auth_type == "api_key":
        if not (claude.get("api_key") or "").strip():
            missing.append("llm.api_key")
    elif auth_type == "gcloud":
        sa = claude.get("service_account_key_data") or {}
        if not (sa.get("project_id") or "").strip():
            missing.append("llm.service_account_key_data.project_id")
    elif not auth_type:
        pass  # already flagged above
    else:
        if not (claude.get("api_key") or "").strip():
            missing.append("llm.api_key")

    model_id = (claude.get("model_id") or "").strip()
    if not model_id:
        missing.append("llm.model_id")

    endpoint = (claude.get("endpoint_pattern") or "").strip()
    if not endpoint:
        missing.append("llm.endpoint_pattern")

    return len(missing) == 0, missing


def get_effective_config(
    shared_pvc: Path,
    base_config_path: Path | None = None,
) -> dict[str, Any]:
    """Merge base config (container image) with admin overlay (PVC).

    Admin config overrides ``claude`` and ``hydra`` keys only.
    All other keys come from the base config.
    """
    base: dict[str, Any] = {}
    if base_config_path and base_config_path.exists():
        try:
            base = json.loads(base_config_path.read_text(encoding="utf-8"))
        except Exception:
            logger.warning("Could not read base config from %s", base_config_path)

    admin = load_admin_config(shared_pvc)

    merged = copy.deepcopy(base)
    if "claude" in admin:
        merged["claude"] = copy.deepcopy(admin["claude"])
    if "hydra" in admin:
        merged["hydra"] = copy.deepcopy(admin["hydra"])
    return merged
