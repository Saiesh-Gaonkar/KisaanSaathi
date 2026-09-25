"""
formulas.py — Deterministic Math Module for KisaanSathi Phase 2

ALL monetary calculations flow through this module.
No LLM or agent is permitted to compute rupee figures independently.

Constants are sourced from Section 3.1 of phase_2_build_spec_final.md:
  - τ_cess        = 0.015       (APMC cess rate)
  - μ_commission   = 0.0225      (APMC commission rate)
  - κ_buyer        = 0.05        (buyer trust penalty coefficient)
  - κ_transporter  = 0.04        (transporter trust penalty coefficient)
  - δ_backhaul     = 0.275       (backhaul discount factor for empty return trips)
  - ω_weighing     = 15.0        (₹ per quintal for weighing & hamali)
  - labor_rate     = 20.0        (₹ per quintal for labor)
"""

from __future__ import annotations

from dataclasses import dataclass


# ──────────────────────────────────────────────
# Constants (Spec Section 3.1)
# ──────────────────────────────────────────────
TAU_CESS: float = 0.015
MU_COMMISSION: float = 0.0225
KAPPA_BUYER: float = 0.05
KAPPA_TRANSPORTER: float = 0.04
DELTA_BACKHAUL: float = 0.275
OMEGA_WEIGHING_HAMALI: float = 15.0  # ₹ per quintal
LABOR_RATE: float = 20.0             # ₹ per quintal


@dataclass(frozen=True)
class CostBreakdown:
    """Immutable result of a full net-realization calculation."""
    gross_revenue: float
    c_logistics: float
    c_mandi: float
    c_shrinkage: float
    p_trust: float
    net_realization: float


# ──────────────────────────────────────────────
# Pure Functions (Spec Section 3.2)
# ──────────────────────────────────────────────

def compute_gross_revenue(quantity_qtl: float, price_per_qtl: float) -> float:
    """Spec §3.2-2:  Gross Revenue = Q × P_bid/modal"""
    return quantity_qtl * price_per_qtl


def compute_logistics_cost(
    distance_km: float,
    tariff_per_km: float,
    is_backhaul: bool,
    quantity_qtl: float,
) -> float:
    """
    Spec §3.2-3:
      C_logistics = (D × T_base × (1 - δ_backhaul)) + L_labor
    where L_labor = Q × labor_rate

    If is_backhaul is False, δ_backhaul = 0 (no discount).
    """
    backhaul_discount = DELTA_BACKHAUL if is_backhaul else 0.0
    transport_cost = distance_km * tariff_per_km * (1.0 - backhaul_discount)
    labor_cost = quantity_qtl * LABOR_RATE
    return transport_cost + labor_cost


def compute_mandi_deductions(
    gross_revenue: float,
    quantity_qtl: float,
    delivery_term: str,
) -> float:
    """
    Spec §3.2-4 (Only if FOR_MANDI):
      C_mandi = Gross × (τ_cess + μ_commission) + (Q × ω_weighing_hamali)

    Returns 0.0 for EX_FARM deliveries.
    """
    if delivery_term != "FOR_MANDI":
        return 0.0
    commission_and_cess = gross_revenue * (TAU_CESS + MU_COMMISSION)
    weighing_hamali = quantity_qtl * OMEGA_WEIGHING_HAMALI
    return commission_and_cess + weighing_hamali


def compute_shrinkage_cost(
    quantity_qtl: float,
    distance_km: float,
    shrinkage_rate_percent: float,
    price_per_qtl: float,
) -> float:
    """
    Spec §3.2-5:
      C_shrinkage = Q × (D / 100) × (σ_crop / 100) × P_bid/modal

    CRUCIAL: The spec says "Divide the shrinkage percentage by 100 before
    multiplying into currency values so C_shrinkage outputs in rupees (₹)."
    """
    return quantity_qtl * (distance_km / 100.0) * (shrinkage_rate_percent / 100.0) * price_per_qtl


def compute_trust_penalty(
    gross_revenue: float,
    buyer_trust_score: float,
    transporter_trust_score: float,
) -> float:
    """
    Spec §3.2-6:
      P_trust = (Gross × max(0, (5 - S_buyer)/5) × κ_buyer)
              + (Gross × max(0, (5 - S_transporter)/5) × κ_transporter)
    """
    buyer_penalty = gross_revenue * max(0.0, (5.0 - buyer_trust_score) / 5.0) * KAPPA_BUYER
    transporter_penalty = gross_revenue * max(0.0, (5.0 - transporter_trust_score) / 5.0) * KAPPA_TRANSPORTER
    return buyer_penalty + transporter_penalty


def compute_net_realization(
    quantity_qtl: float,
    price_per_qtl: float,
    distance_km: float,
    tariff_per_km: float,
    is_backhaul: bool,
    delivery_term: str,
    shrinkage_rate_percent: float,
    buyer_trust_score: float,
    transporter_trust_score: float,
) -> CostBreakdown:
    """
    Spec §3.2-1:
      NR = Gross Revenue - C_logistics - C_mandi - C_shrinkage - P_trust

    This is the master function that agents call. Returns a full CostBreakdown
    so every intermediate value is traceable and auditable.
    """
    gross = compute_gross_revenue(quantity_qtl, price_per_qtl)

    c_logistics = compute_logistics_cost(
        distance_km=distance_km,
        tariff_per_km=tariff_per_km,
        is_backhaul=is_backhaul,
        quantity_qtl=quantity_qtl,
    )

    c_mandi = compute_mandi_deductions(
        gross_revenue=gross,
        quantity_qtl=quantity_qtl,
        delivery_term=delivery_term,
    )

    c_shrinkage = compute_shrinkage_cost(
        quantity_qtl=quantity_qtl,
        distance_km=distance_km,
        shrinkage_rate_percent=shrinkage_rate_percent,
        price_per_qtl=price_per_qtl,
    )

    p_trust = compute_trust_penalty(
        gross_revenue=gross,
        buyer_trust_score=buyer_trust_score,
        transporter_trust_score=transporter_trust_score,
    )

    net = gross - c_logistics - c_mandi - c_shrinkage - p_trust

    return CostBreakdown(
        gross_revenue=gross,
        c_logistics=c_logistics,
        c_mandi=c_mandi,
        c_shrinkage=c_shrinkage,
        p_trust=p_trust,
        net_realization=net,
    )
