"""Legal document registry — content/legal_documents.json + docs/ui/*.md paths."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from utils.content import _content_dir, _wrap


def load_legal_documents_registry() -> Any:
    """Load content/legal_documents.json as a wrapped dict."""
    path = _content_dir() / "legal_documents.json"
    if not path.exists():
        raise FileNotFoundError(f"content/legal_documents.json not found at {path}")
    with open(path, encoding="utf-8") as f:
        return _wrap(json.load(f))


def get_document_by_id(doc_id: str) -> dict[str, Any] | None:
    registry = load_legal_documents_registry()
    for doc in registry.documents:
        if doc.id == doc_id:
            return {
                "id": doc.id,
                "title": doc.title,
                "repo_path": doc.repo_path,
                "document_version": doc.document_version,
                "effective_date": doc.effective_date,
                "required_for_acceptance": bool(doc.required_for_acceptance),
                "internal_only": bool(doc.internal_only),
            }
    return None


def list_documents() -> list[dict[str, Any]]:
    registry = load_legal_documents_registry()
    return [
        {
            "id": doc.id,
            "title": doc.title,
            "repo_path": doc.repo_path,
            "document_version": doc.document_version,
            "effective_date": doc.effective_date,
            "required_for_acceptance": bool(doc.required_for_acceptance),
            "internal_only": bool(doc.internal_only),
        }
        for doc in registry.documents
    ]


def strip_yaml_frontmatter(text: str) -> str:
    """Remove leading --- YAML --- block from markdown legal files."""
    if not text.startswith("---"):
        return text
    parts = text.split("---", 2)
    if len(parts) >= 3:
        return parts[2].lstrip("\n")
    return text


def repo_root() -> Path:
    return _content_dir().parent


def resolve_markdown_path(repo_path: str) -> Path | None:
    """Resolve repo_path to an existing file (checkout or container)."""
    filename = Path(repo_path).name
    rel = repo_path.replace("\\", "/").lstrip("/")
    candidates = [
        Path(f"/{rel}"),
        repo_root() / rel,
        Path(f"/docs/ui/{filename}"),
        repo_root() / "docs" / "ui" / filename,
        # Legacy single-file layout
        Path("/docs/AI_USAGE_NOTICE.md"),
        repo_root() / "docs" / "AI_USAGE_NOTICE.md",
    ]
    for path in candidates:
        if path.is_file():
            return path
    return None


def documents_required_for_acceptance(deployment_mode: str) -> list[dict[str, Any]]:
    """Filter registry for acceptance modal; omit internal_only when not internal."""
    mode = (deployment_mode or "internal").strip().lower()
    out: list[dict[str, Any]] = []
    for doc in list_documents():
        if not doc["required_for_acceptance"]:
            continue
        if doc["internal_only"] and mode != "internal":
            continue
        out.append(doc)
    return out
