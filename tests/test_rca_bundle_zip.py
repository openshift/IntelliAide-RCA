"""RCA bundle ZIP endpoints."""

import sys
from pathlib import Path

import pytest

_REPO = Path(__file__).resolve().parents[1]
_API = _REPO / "src" / "api"
if str(_API) not in sys.path:
    sys.path.insert(0, str(_API))


@pytest.fixture()
def bundle_client(tmp_path, monkeypatch):
    mount = str(tmp_path)
    monkeypatch.setenv("SHARED_PVC_MOUNT", mount)
    import importlib

    import job_runner

    monkeypatch.setattr(job_runner, "SHARED_PVC_MOUNT", mount, raising=False)

    import api as api_mod

    importlib.reload(job_runner)
    importlib.reload(api_mod)
    monkeypatch.setattr(api_mod, "SHARED_PVC_MOUNT", tmp_path)
    from fastapi.testclient import TestClient

    return TestClient(api_mod.app), tmp_path, api_mod


def test_full_bundle_zip_requires_session(bundle_client):
    client, _, _ = bundle_client
    r = client.get("/full-bundle-zip")
    assert r.status_code == 400
    assert "session" in r.json()["detail"].lower()


def test_rca_stage_pdf_with_dejavu_fonts():
    """Regression: slim API image has DejaVu regular/bold but footer must not use DejaVu I."""
    sys.path.insert(0, str(_API))
    from fpdf import FPDF
    from utils.rca_doc_export import build_rca_stage_pdf

    dejavu = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    dejavu_b = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    if not (Path(dejavu).is_file() and Path(dejavu_b).is_file()):
        pytest.skip("DejaVu fonts not installed on runner")

    class _ProbePDF(FPDF):
        pass

    probe = _ProbePDF()
    probe.add_font("DejaVu", "", dejavu, uni=True)
    probe.add_font("DejaVu", "B", dejavu_b, uni=True)

    pdf_bytes = build_rca_stage_pdf(
        "RCA Tier 1",
        "## Executive Summary\n\nSample body.\n",
        dag_png=None,
    )
    assert pdf_bytes[:4] == b"%PDF"


def test_full_bundle_zip_builds_zip(bundle_client):
    client, root, _ = bundle_client
    sid = "session_bundle_test"
    results = root / "jobs" / sid / "results"
    results.mkdir(parents=True)
    (results / "RCA_Tier1.txt").write_text(
        "# Tier 1\n\n## Executive Summary\n\nSample RCA body.\n",
        encoding="utf-8",
    )
    r = client.get(f"/full-bundle-zip?session={sid}")
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("application/zip")
    assert r.content[:2] == b"PK"
