"""Tests for shared content registry (content/*.json)."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src", "api", "utils"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src", "api"))

from utils.content import (
    RCA_ANALYTICS_PRIORITY_LABELS,
    RCA_COST_ANALYTICS_LABELS,
    RCA_STAGE_EXPORT_PAIRS,
    STAGE_API_TO_RESULT_FILE,
    STAGE_DISPLAY,
    STAGE_FILE_KEY,
    load_content_file,
    notices,
    rca_stages,
)


class TestNoticesContent:
    def test_notices_loads_export_disclaimer(self):
        assert len(notices.export_disclaimer.body) > 20


class TestRcaStagesContent:
    def test_stage_api_to_file_mapping(self):
        assert STAGE_API_TO_RESULT_FILE["Tier_1"] == "RCA_Tier1.txt"
        assert STAGE_API_TO_RESULT_FILE["Final"] == "RCA_Final.txt"

    def test_priority_bucket_matches_legacy(self):
        assert STAGE_FILE_KEY["high"] == "Tier1"
        assert STAGE_DISPLAY["reselect"] == "Tier 2 (re-select)"

    def test_export_pairs_align_with_stages(self):
        assert len(RCA_STAGE_EXPORT_PAIRS) == 3
        assert RCA_STAGE_EXPORT_PAIRS[0][0].startswith("RCA_")

    def test_analytics_labels_order(self):
        assert RCA_ANALYTICS_PRIORITY_LABELS == ["Tier 1", "Tier 2", "Final"]
        assert RCA_COST_ANALYTICS_LABELS[0][0] == "Tier1"

    def test_stages_ordered(self):
        orders = [s.order for s in rca_stages.stages]
        assert orders == sorted(orders)

    def test_load_content_file_notices(self):
        doc = load_content_file("notices")
        assert doc.persistent_banner.text
