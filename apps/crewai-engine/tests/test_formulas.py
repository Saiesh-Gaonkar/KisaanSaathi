"""
test_formulas.py — Baseline Arithmetic Assertions from Spec Section 7

These tests MUST pass exactly as specified. They are the ground-truth
contract that prevents silent math refactor errors.

Baseline Inputs (Spec §7):
  Q = 40, P = 2000, D = 100, T_base = 15
  delivery_term = FOR_MANDI, is_backhaul = False
  σ_crop = 1.5 (Tomato midpoint)
  S_buyer = 4.5, S_transporter = 4.0

Expected Outputs:
  Gross Revenue  == 80000
  C_logistics    == 2300   (100*15*1) + (40*20)
  C_mandi        == 3600   (80000*0.0375) + (40*15)
  C_shrinkage    == 1200   40 * (100/100) * (1.5/100) * 2000
  P_trust        == 1040   (80000*((5-4.5)/5)*0.05) + (80000*((5-4)/5)*0.04)
  Net Realization== 71860
"""

import pytest

from app.formulas import (
    CostBreakdown,
    compute_gross_revenue,
    compute_logistics_cost,
    compute_mandi_deductions,
    compute_net_realization,
    compute_shrinkage_cost,
    compute_trust_penalty,
)


# ──────────────────────────────────────────────
# Baseline test inputs (Spec Section 7)
# ──────────────────────────────────────────────
Q = 40.0             # quantity in quintals
P = 2000.0           # price per quintal
D = 100.0            # distance in km
T_BASE = 15.0        # tariff per km
DELIVERY_TERM = "FOR_MANDI"
IS_BACKHAUL = False
SIGMA_CROP = 1.5     # Tomato midpoint shrinkage rate
S_BUYER = 4.5        # buyer trust score
S_TRANSPORTER = 4.0  # transporter trust score


class TestBaselineArithmetic:
    """Spec Section 7 — exact figure assertions."""

    def test_gross_revenue(self):
        result = compute_gross_revenue(Q, P)
        assert result == 80000.0, f"Expected 80000, got {result}"

    def test_logistics_cost(self):
        result = compute_logistics_cost(
            distance_km=D,
            tariff_per_km=T_BASE,
            is_backhaul=IS_BACKHAUL,
            quantity_qtl=Q,
        )
        # (100 * 15 * 1.0) + (40 * 20) = 1500 + 800 = 2300
        assert result == 2300.0, f"Expected 2300, got {result}"

    def test_mandi_deductions(self):
        gross = compute_gross_revenue(Q, P)
        result = compute_mandi_deductions(
            gross_revenue=gross,
            quantity_qtl=Q,
            delivery_term=DELIVERY_TERM,
        )
        # (80000 * 0.0375) + (40 * 15) = 3000 + 600 = 3600
        assert result == 3600.0, f"Expected 3600, got {result}"

    def test_mandi_deductions_ex_farm_is_zero(self):
        gross = compute_gross_revenue(Q, P)
        result = compute_mandi_deductions(
            gross_revenue=gross,
            quantity_qtl=Q,
            delivery_term="EX_FARM",
        )
        assert result == 0.0, f"EX_FARM should have 0 mandi cost, got {result}"

    def test_shrinkage_cost(self):
        result = compute_shrinkage_cost(
            quantity_qtl=Q,
            distance_km=D,
            shrinkage_rate_percent=SIGMA_CROP,
            price_per_qtl=P,
        )
        # 40 * (100/100) * (1.5/100) * 2000 = 40 * 1.0 * 0.015 * 2000 = 1200
        assert result == 1200.0, f"Expected 1200, got {result}"

    def test_trust_penalty(self):
        gross = compute_gross_revenue(Q, P)
        result = compute_trust_penalty(
            gross_revenue=gross,
            buyer_trust_score=S_BUYER,
            transporter_trust_score=S_TRANSPORTER,
        )
        # Buyer:  80000 * ((5-4.5)/5) * 0.05 = 80000 * 0.1 * 0.05 = 400
        # Trans:  80000 * ((5-4.0)/5) * 0.04 = 80000 * 0.2 * 0.04 = 640
        # Total: 1040
        assert result == 1040.0, f"Expected 1040, got {result}"

    def test_net_realization_full_pipeline(self):
        """End-to-end: all five cost components combined."""
        breakdown = compute_net_realization(
            quantity_qtl=Q,
            price_per_qtl=P,
            distance_km=D,
            tariff_per_km=T_BASE,
            is_backhaul=IS_BACKHAUL,
            delivery_term=DELIVERY_TERM,
            shrinkage_rate_percent=SIGMA_CROP,
            buyer_trust_score=S_BUYER,
            transporter_trust_score=S_TRANSPORTER,
        )
        assert isinstance(breakdown, CostBreakdown)
        assert breakdown.gross_revenue == 80000.0
        assert breakdown.c_logistics == 2300.0
        assert breakdown.c_mandi == 3600.0
        assert breakdown.c_shrinkage == 1200.0
        assert breakdown.p_trust == 1040.0
        assert breakdown.net_realization == 71860.0


class TestBackhaulDiscount:
    """Verify backhaul discount applies correctly."""

    def test_backhaul_reduces_transport_cost(self):
        without = compute_logistics_cost(D, T_BASE, is_backhaul=False, quantity_qtl=Q)
        with_bh = compute_logistics_cost(D, T_BASE, is_backhaul=True, quantity_qtl=Q)
        # Backhaul: (100*15*(1-0.275)) + 800 = 1087.5 + 800 = 1887.5
        assert with_bh == 1887.5, f"Expected 1887.5, got {with_bh}"
        assert with_bh < without


class TestTrustEdgeCases:
    """Trust scores at boundaries."""

    def test_perfect_trust_no_penalty(self):
        gross = 80000.0
        result = compute_trust_penalty(gross, buyer_trust_score=5.0, transporter_trust_score=5.0)
        assert result == 0.0

    def test_zero_trust_max_penalty(self):
        gross = 80000.0
        result = compute_trust_penalty(gross, buyer_trust_score=0.0, transporter_trust_score=0.0)
        # Buyer: 80000 * 1.0 * 0.05 = 4000
        # Trans: 80000 * 1.0 * 0.04 = 3200
        assert result == 7200.0
