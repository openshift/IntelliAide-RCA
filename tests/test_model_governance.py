"""Tests for model_governance — AIA-015 allowlist/blocklist validation."""

import json
import os
import sys
import tempfile

import pytest

# Ensure the core module is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src", "api", "core"))

from model_governance import apply_gemini_safety, validate_model_allowed


def _write_config(tmp_dir, config_data):
    """Write a config.json in tmp_dir and return its path."""
    path = os.path.join(tmp_dir, "config.json")
    with open(path, "w") as f:
        json.dump(config_data, f)
    return path


class TestValidateModelAllowed:
    """validate_model_allowed() blocks disallowed models and passes allowed ones."""

    def test_blocks_qwen_model(self, tmp_path):
        cfg = {
            "deployment_mode": "internal",
            "model_governance": {
                "enabled": True,
                "blocked_models": ["qwen"],
                "allowed_models": ["claude-sonnet-4-6"],
            },
        }
        path = _write_config(str(tmp_path), cfg)
        with pytest.raises(RuntimeError, match="not approved"):
            validate_model_allowed("qwen-2.5-72b", path)

    def test_blocks_qwen_substring_match(self, tmp_path):
        cfg = {
            "deployment_mode": "internal",
            "model_governance": {
                "enabled": True,
                "blocked_models": ["qwen"],
                "allowed_models": [],
            },
        }
        path = _write_config(str(tmp_path), cfg)
        with pytest.raises(RuntimeError):
            validate_model_allowed("my-custom-qwen-model", path)

    def test_allows_claude_model(self, tmp_path):
        cfg = {
            "deployment_mode": "internal",
            "model_governance": {
                "enabled": True,
                "blocked_models": ["qwen"],
                "allowed_models": ["claude-sonnet-4-6"],
            },
        }
        path = _write_config(str(tmp_path), cfg)
        validate_model_allowed("claude-sonnet-4-6", path)

    def test_allows_prefix_match(self, tmp_path):
        cfg = {
            "deployment_mode": "internal",
            "model_governance": {
                "enabled": True,
                "blocked_models": ["qwen"],
                "allowed_models": ["claude-sonnet-4"],
                "require_exact_match": False,
            },
        }
        path = _write_config(str(tmp_path), cfg)
        validate_model_allowed("claude-sonnet-4-6", path)

    def test_rejects_unlisted_model_with_allowlist(self, tmp_path):
        cfg = {
            "deployment_mode": "internal",
            "model_governance": {
                "enabled": True,
                "blocked_models": [],
                "allowed_models": ["claude-sonnet-4-6"],
            },
        }
        path = _write_config(str(tmp_path), cfg)
        with pytest.raises(RuntimeError, match="not in approved list"):
            validate_model_allowed("llama-3-70b", path)

    def test_exact_match_mode(self, tmp_path):
        cfg = {
            "deployment_mode": "internal",
            "model_governance": {
                "enabled": True,
                "blocked_models": [],
                "allowed_models": ["claude-sonnet-4-6"],
                "require_exact_match": True,
            },
        }
        path = _write_config(str(tmp_path), cfg)
        validate_model_allowed("claude-sonnet-4-6", path)
        with pytest.raises(RuntimeError, match="not in approved list"):
            validate_model_allowed("claude-sonnet-4-6-extended", path)

    def test_external_mode_skips_all_checks(self, tmp_path):
        cfg = {
            "deployment_mode": "external",
            "model_governance": {
                "enabled": True,
                "blocked_models": ["qwen"],
                "allowed_models": ["claude-sonnet-4-6"],
            },
        }
        path = _write_config(str(tmp_path), cfg)
        # Qwen should pass in external mode
        validate_model_allowed("qwen-2.5-72b", path)
        # Unknown model should also pass
        validate_model_allowed("any-custom-model", path)

    def test_disabled_governance_skips_checks(self, tmp_path):
        cfg = {
            "deployment_mode": "internal",
            "model_governance": {
                "enabled": False,
                "blocked_models": ["qwen"],
                "allowed_models": ["claude-sonnet-4-6"],
            },
        }
        path = _write_config(str(tmp_path), cfg)
        validate_model_allowed("qwen-2.5-72b", path)

    def test_empty_model_id_raises(self, tmp_path):
        cfg = {
            "deployment_mode": "internal",
            "model_governance": {"enabled": True},
        }
        path = _write_config(str(tmp_path), cfg)
        with pytest.raises(RuntimeError, match="No model_id"):
            validate_model_allowed("", path)

    def test_missing_config_uses_defaults(self, tmp_path):
        path = os.path.join(str(tmp_path), "nonexistent.json")
        # Default blocks qwen
        with pytest.raises(RuntimeError):
            validate_model_allowed("qwen-2.5", path)
        # Default allows claude
        validate_model_allowed("claude-sonnet-4-6", path)

    def test_empty_allowlist_only_checks_blocklist(self, tmp_path):
        cfg = {
            "deployment_mode": "internal",
            "model_governance": {
                "enabled": True,
                "blocked_models": ["qwen"],
                "allowed_models": [],
            },
        }
        path = _write_config(str(tmp_path), cfg)
        validate_model_allowed("any-random-model", path)
        with pytest.raises(RuntimeError):
            validate_model_allowed("qwen-large", path)

    def test_custom_block_message(self, tmp_path):
        cfg = {
            "deployment_mode": "internal",
            "model_governance": {
                "enabled": True,
                "blocked_models": ["qwen"],
                "allowed_models": ["claude-sonnet-4-6"],
                "block_message": "BLOCKED: {model} is forbidden. Use: {allowed}.",
            },
        }
        path = _write_config(str(tmp_path), cfg)
        with pytest.raises(RuntimeError, match="BLOCKED: qwen-7b is forbidden"):
            validate_model_allowed("qwen-7b", path)


class TestApplyGeminiSafety:
    """apply_gemini_safety() injects safety settings for Gemini models only."""

    def test_injects_safety_for_gemini(self):
        payload = {"max_tokens": 100}
        result = apply_gemini_safety("gemini-1.5-pro", payload)
        assert "safety_settings" in result
        assert len(result["safety_settings"]) == 4

    def test_no_injection_for_claude(self):
        payload = {"max_tokens": 100}
        result = apply_gemini_safety("claude-sonnet-4-6", payload)
        assert "safety_settings" not in result

    def test_does_not_overwrite_existing_settings(self):
        existing = [{"category": "CUSTOM", "threshold": "BLOCK_ALL"}]
        payload = {"safety_settings": existing}
        result = apply_gemini_safety("gemini-2.0-flash", payload)
        assert result["safety_settings"] == existing
