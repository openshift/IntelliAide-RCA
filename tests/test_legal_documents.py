"""Tests for legal document registry and path resolution (AIA-007)."""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src", "api"))

from utils.legal_documents import (
    documents_required_for_acceptance,
    get_document_by_id,
    list_documents,
    load_legal_documents_registry,
    resolve_markdown_path,
)


def test_registry_loads_three_documents():
    reg = load_legal_documents_registry()
    assert reg._bundle_version == "2.0"
    assert len(list_documents()) == 3


def test_get_document_by_id():
    doc = get_document_by_id("user_guide")
    assert doc is not None
    assert doc["repo_path"].endswith("INTELLIAIDE_USER_GUIDE.md")


def test_resolve_markdown_path_for_ui_docs():
    doc = get_document_by_id("ai_usage_notice")
    assert doc is not None
    path = resolve_markdown_path(doc["repo_path"])
    assert path is not None
    assert path.is_file()
    assert "AI_USAGE_NOTICE" in path.name


def test_internal_only_filtered_for_external_mode():
    internal = documents_required_for_acceptance("internal")
    external = documents_required_for_acceptance("external")
    internal_ids = {d["id"] for d in internal}
    external_ids = {d["id"] for d in external}
    assert "customer_uploaded_content_ai" in internal_ids
    assert "customer_uploaded_content_ai" not in external_ids
    assert "user_guide" in external_ids


def test_bundle_version_matches_config_template():
    reg = load_legal_documents_registry()
    template = (
        Path(__file__).resolve().parent.parent
        / "src"
        / "api"
        / "config"
        / "config.json.template"
    )
    cfg = json.loads(template.read_text(encoding="utf-8"))
    assert reg._bundle_version == cfg["notice"]["document_version"]
