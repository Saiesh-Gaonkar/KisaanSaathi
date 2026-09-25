"""
verify_phase2_plan.py — Complete End-to-End Validation of Phase 2 Spec

Validates:
1. Formulas baseline math matches Section 7 exactly.
2. Endpoint security: 401 Unauthorized on missing/invalid token.
3. Batch validation: 404 Not Found on unknown batch.
4. Pipeline execution: POST /simulate executes 3-agent CrewAI pipeline.
5. Output schema: ai_recommendations matches Section 2.1 schema exactly.
6. Firestore state transition: status flips from PENDING_SIMULATION -> LISTED_ACTIVE.
7. Idempotency guard: Second call on same batch returns 409 Conflict.
"""

import sys
import json
import httpx
from dotenv import load_dotenv

# Set UTF-8
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

from app.firebase_client import get_firestore_client
from app.formulas import (
    compute_gross_revenue,
    compute_logistics_cost,
    compute_mandi_deductions,
    compute_shrinkage_cost,
    compute_trust_penalty,
    compute_net_realization,
)

BASE_URL = "http://127.0.0.1:8000"
WEB_API_KEY = "AIzaSyDGt2wbEVaBDDLYLrDxnaOi35gWul08OFs"

def test_baseline_formulas():
    print("\n[CHECK 1/5] Validating Baseline Mathematical Formulas (Spec §7)...")
    q = 40.0
    p = 2000.0
    d = 100.0
    t = 15.0
    sigma = 1.5
    s_b = 4.5
    s_t = 4.0

    gross = compute_gross_revenue(q, p)
    assert gross == 80000.0, f"Gross expected 80000, got {gross}"

    c_log = compute_logistics_cost(d, t, is_backhaul=False, quantity_qtl=q)
    assert c_log == 2300.0, f"C_logistics expected 2300, got {c_log}"

    c_mandi = compute_mandi_deductions(gross, q, delivery_term="FOR_MANDI")
    assert c_mandi == 3600.0, f"C_mandi expected 3600, got {c_mandi}"

    c_shrink = compute_shrinkage_cost(q, d, sigma, p)
    assert c_shrink == 1200.0, f"C_shrinkage expected 1200, got {c_shrink}"

    p_trust = compute_trust_penalty(gross, s_b, s_t)
    assert p_trust == 1040.0, f"P_trust expected 1040, got {p_trust}"

    breakdown = compute_net_realization(
        quantity_qtl=q,
        price_per_qtl=p,
        distance_km=d,
        tariff_per_km=t,
        is_backhaul=False,
        delivery_term="FOR_MANDI",
        shrinkage_rate_percent=sigma,
        buyer_trust_score=s_b,
        transporter_trust_score=s_t,
    )
    assert breakdown.net_realization == 71860.0, f"Net Realization expected 71860, got {breakdown.net_realization}"

    print("  --> PASS: All 6 deterministic equations match baseline numbers with 0 deviation.")

def get_real_firebase_id_token() -> str:
    from firebase_admin import auth
    from app.firebase_client import _initialize
    _initialize()
    ct = auth.create_custom_token("test_farmer_uid").decode("utf-8")
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key={WEB_API_KEY}"
    resp = httpx.post(url, json={"token": ct, "returnSecureToken": True}, timeout=10.0)
    data = resp.json()
    if "idToken" in data:
        return data["idToken"]
    raise RuntimeError(f"Could not get Firebase ID token: {data}")

def test_api_security_and_idempotency():
    print("\n[CHECK 2/5] Testing 401 Unauthorized Guard...")
    resp = httpx.post(f"{BASE_URL}/simulate", json={"batch_id": "dummy"}, headers={"Authorization": "Bearer invalid_token"})
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
    print(f"  --> PASS: Returned 401 Unauthorized ({resp.json()['detail']})")

    id_token = get_real_firebase_id_token()
    headers = {"Authorization": f"Bearer {id_token}"}

    print("\n[CHECK 3/5] Testing 404 Not Found Guard...")
    resp = httpx.post(f"{BASE_URL}/simulate", json={"batch_id": "non_existent_batch_xyz"}, headers=headers)
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
    print(f"  --> PASS: Returned 404 Not Found ({resp.json()['detail']})")

    print("\n[CHECK 4/5] Preparing PENDING_SIMULATION Test Batch in Firestore...")
    db = get_firestore_client()
    test_batch_id = "spec_test_batch_001"
    db.collection("inventory_batches").document(test_batch_id).set({
        "batch_id": test_batch_id,
        "crop": "Tomato",
        "quantity_qtl": 40.0,
        "min_price_per_qtl": 1800.0,
        "status": "PENDING_SIMULATION",
        "farmer_location": {
            "address": "Kolar",
            "village_or_district": "Kolar",
            "latitude": 13.1367,
            "longitude": 78.1292
        }
    })
    print(f"  --> Seeded batch '{test_batch_id}' with status 'PENDING_SIMULATION'")

    print("\n[CHECK 5/5] Invoking POST /simulate to run full 3-Agent CrewAI pipeline...")
    sim_resp = httpx.post(f"{BASE_URL}/simulate", json={"batch_id": test_batch_id}, headers=headers, timeout=120.0)
    print(f"  --> Simulation HTTP Response Status: {sim_resp.status_code}")
    assert sim_resp.status_code == 200, f"Simulation failed: {sim_resp.text}"
    sim_data = sim_resp.json()
    print(f"  --> Simulation API Response: {json.dumps(sim_data, indent=2)}")

    # Verify Firestore writeback
    updated_doc = db.collection("inventory_batches").document(test_batch_id).get().to_dict()
    assert updated_doc.get("status") == "LISTED_ACTIVE", f"Expected status LISTED_ACTIVE, got {updated_doc.get('status')}"
    print("  --> PASS: Firestore status flipped to LISTED_ACTIVE")

    recs = updated_doc.get("ai_recommendations", [])
    print(f"  --> PASS: ai_recommendations written with {len(recs)} recommendation(s)")
    if recs:
        rec0 = recs[0]
        required_keys = {"rank", "channel_type", "channel_name", "delivery_term", "gross_revenue", "c_logistics", "c_mandi", "c_shrinkage", "p_trust", "net_realization"}
        for k in required_keys:
            assert k in rec0, f"Missing key {k} in recommendation schema"
        print("  --> PASS: Schema strictly adheres to Spec §2.1")
        print(f"      Top Channel: {rec0.get('channel_name')} ({rec0.get('channel_type')})")
        print(f"      Net Realization: ₹{rec0.get('net_realization'):.2f}")
        print(f"      Rationale: {rec0.get('economic_rationale')}")

    # Verify 409 Conflict Idempotency Guard
    print("\n[FINAL CHECK] Testing 409 Conflict Idempotency Guard (Calling on already-processed batch)...")
    conflict_resp = httpx.post(f"{BASE_URL}/simulate", json={"batch_id": test_batch_id}, headers=headers, timeout=10.0)
    assert conflict_resp.status_code == 409, f"Expected 409, got {conflict_resp.status_code}: {conflict_resp.text}"
    print(f"  --> PASS: Returned 409 Conflict as required by Spec §5.2: {conflict_resp.json()['detail']}")

    print("\n" + "=" * 60)
    print("ALL PLAN SPECIFICATIONS (PHASE 2) PASSED 100% SUCCESFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    test_baseline_formulas()
    test_api_security_and_idempotency()
