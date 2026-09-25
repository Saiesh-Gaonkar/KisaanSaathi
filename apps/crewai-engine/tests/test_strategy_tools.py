"""
test_strategy_tools.py — Unit tests for strategy tools.

Tests that the compute_channel_economics tool correctly wraps formulas.py
and that the rank_channels tool produces valid spec §2.1 output.
"""

import json

import pytest

from app.tools.strategy_tools import compute_channel_economics, rank_channels


class TestComputeChannelEconomics:
    """Test the channel economics computation wrapper."""

    def test_baseline_scenario(self):
        """Spec §7 baseline inputs should produce matching outputs."""
        result = json.loads(compute_channel_economics.run(
            quantity_qtl=40.0,
            price_per_qtl=2000.0,
            distance_km=100.0,
            tariff_per_km=15.0,
            is_backhaul=False,
            delivery_term="FOR_MANDI",
            shrinkage_rate_percent=1.5,
            buyer_trust_score=4.5,
            transporter_trust_score=4.0,
            channel_type="APMC_MANDI",
            channel_name="Hubballi (Amaragol)",
            buyer_id="null",
            transporter_id="uid_321",
        ))

        assert result["gross_revenue"] == 80000.0
        assert result["c_logistics"] == 2300.0
        assert result["c_mandi"] == 3600.0
        assert result["c_shrinkage"] == 1200.0
        assert result["p_trust"] == 1040.0
        assert result["net_realization"] == 71860.0
        assert result["channel_type"] == "APMC_MANDI"
        assert result["buyer_id"] is None  # "null" converts to None
        assert result["transporter_id"] == "uid_321"

    def test_ex_farm_no_mandi_cost(self):
        """EX_FARM deliveries should have zero mandi deductions."""
        result = json.loads(compute_channel_economics.run(
            quantity_qtl=40.0,
            price_per_qtl=1800.0,
            distance_km=0.0,
            tariff_per_km=0.0,
            is_backhaul=False,
            delivery_term="EX_FARM",
            shrinkage_rate_percent=1.5,
            buyer_trust_score=4.0,
            transporter_trust_score=5.0,
            channel_type="DIRECT_BUYER",
            channel_name="Test Buyer",
            buyer_id="uid_456",
            transporter_id="null",
        ))

        assert result["c_mandi"] == 0.0
        assert result["delivery_term"] == "EX_FARM"
        assert result["transporter_id"] is None


class TestRankChannels:
    """Test the ranking tool."""

    def test_ranks_by_net_realization_descending(self):
        channels = [
            {"channel_type": "A", "channel_name": "Low", "net_realization": 50000,
             "gross_revenue": 80000, "c_logistics": 2000, "c_mandi": 3000,
             "c_shrinkage": 1000, "p_trust": 500, "delivery_term": "FOR_MANDI",
             "buyer_id": None, "transporter_id": "t1"},
            {"channel_type": "B", "channel_name": "High", "net_realization": 70000,
             "gross_revenue": 80000, "c_logistics": 1000, "c_mandi": 0,
             "c_shrinkage": 500, "p_trust": 200, "delivery_term": "EX_FARM",
             "buyer_id": "b1", "transporter_id": None},
        ]
        result = json.loads(rank_channels.run(channel_results_json=json.dumps(channels)))

        assert len(result) == 2
        assert result[0]["rank"] == 1
        assert result[0]["channel_name"] == "High"
        assert result[0]["net_realization"] == 70000
        assert result[1]["rank"] == 2
        assert result[1]["channel_name"] == "Low"

    def test_output_has_all_required_fields(self):
        """Verify output matches spec §2.1 schema."""
        channels = [
            {"channel_type": "APMC_MANDI", "channel_name": "Test",
             "net_realization": 60000, "gross_revenue": 80000,
             "c_logistics": 2000, "c_mandi": 3000, "c_shrinkage": 1000,
             "p_trust": 500, "delivery_term": "FOR_MANDI",
             "buyer_id": None, "transporter_id": "t1"},
        ]
        result = json.loads(rank_channels.run(channel_results_json=json.dumps(channels)))

        required_fields = {
            "rank", "channel_type", "channel_name", "buyer_id",
            "transporter_id", "delivery_term", "gross_revenue",
            "c_logistics", "c_mandi", "c_shrinkage", "p_trust",
            "net_realization", "economic_rationale",
        }
        assert required_fields.issubset(result[0].keys())

    def test_empty_array(self):
        result = json.loads(rank_channels.run(channel_results_json="[]"))
        assert result == []
