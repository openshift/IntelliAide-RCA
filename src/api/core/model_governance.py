"""Model governance — allowlist / blocklist validation per AIA-015, 016, 017, 018.

Enforces model restrictions before any LLM inference call. When
deployment_mode is 'internal' (Red Hat), Qwen and non-approved models are
blocked. When 'external', governance is skipped so customers can configure
their own models freely.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

_DEFAULT_BLOCKED = ["qwen"]
_DEFAULT_ALLOWED = [
    "claude-sonnet-4-6",
    "claude-3-5-sonnet-20241022",
    "claude-3-opus-20240229",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
]


def _load_config(config_path: str = "config.json") -> Dict[str, Any]:
    """Load effective config (base + admin overlay) using PVC merge layer.

    Falls back to reading the base config directly when the PVC helper is
    unavailable (e.g. standalone CLI usage).
    """
    try:
        from app_paths import get_config_path, get_shared_pvc_mount

        if config_path == "config.json":
            base_path = get_config_path()
        else:
            base_path = Path(config_path)
    except ImportError:
        base_path = Path(__file__).resolve().parent / config_path

    try:
        from instance_settings import get_effective_config

        pvc = get_shared_pvc_mount()
        return get_effective_config(pvc, base_path)
    except Exception:
        pass

    if not base_path.exists():
        return {}
    try:
        with open(base_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _load_governance(config_path: str = "config.json") -> Dict[str, Any]:
    """Load model governance config, falling back to hardcoded defaults."""
    cfg = _load_config(config_path)
    gov = cfg.get("model_governance", {})
    if not isinstance(gov, dict):
        gov = {}
    gov.setdefault("enabled", True)
    gov.setdefault("blocked_models", _DEFAULT_BLOCKED)
    gov.setdefault("allowed_models", _DEFAULT_ALLOWED)
    gov.setdefault("require_exact_match", False)
    gov.setdefault(
        "block_message",
        "Model '{model}' is not approved for use with Intelliaide. "
        "Approved models: {allowed}. Contact your administrator.",
    )
    return gov


def validate_model_allowed(model_id: str, config_path: str = "config.json") -> None:
    """Raise RuntimeError if *model_id* is blocked or not in the allowlist.

    Skips validation entirely when ``deployment_mode`` is ``"external"``
    (customer-managed deployments where the operator chooses their own models).
    """
    cfg = _load_config(config_path)
    deployment_mode = cfg.get("deployment_mode", "internal")
    if deployment_mode == "external":
        return

    gov = _load_governance(config_path)
    if not gov.get("enabled", True):
        return

    model_lower = (model_id or "").strip().lower()
    if not model_lower:
        raise RuntimeError("No model_id configured.")

    # Blocked list (substring match)
    for blocked in gov.get("blocked_models", _DEFAULT_BLOCKED):
        if blocked.lower() in model_lower:
            allowed = gov.get("allowed_models", [])
            allowed_str = ", ".join(allowed) if allowed else "(none configured)"
            msg = gov.get(
                "block_message",
                "Model '{model}' is blocked per AIA policy. Approved: {allowed}.",
            ).format(model=model_id, allowed=allowed_str)
            raise RuntimeError(msg)

    # Allowed list
    allowed = gov.get("allowed_models", [])
    if not allowed:
        return  # empty allowlist = no restriction beyond blocklist

    exact = gov.get("require_exact_match", False)
    if exact:
        if model_lower not in [a.lower() for a in allowed]:
            raise RuntimeError(
                f"Model '{model_id}' not in approved list: {', '.join(allowed)}."
            )
    else:
        if not any(
            model_lower.startswith(a.lower()) or a.lower().startswith(model_lower)
            for a in allowed
        ):
            raise RuntimeError(
                f"Model '{model_id}' not in approved list: {', '.join(allowed)}."
            )


def apply_gemini_safety(model_id: str, payload: dict) -> dict:
    """If model is Gemini, inject required Google safety settings (AIA-016)."""
    if "gemini" in (model_id or "").lower():
        payload.setdefault(
            "safety_settings",
            [
                {
                    "category": "HARM_CATEGORY_HARASSMENT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    "category": "HARM_CATEGORY_HATE_SPEECH",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE",
                },
            ],
        )
    return payload
