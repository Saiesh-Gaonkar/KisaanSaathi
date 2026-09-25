# KisaanSathi — Phase 2 Build Spec: CrewAI Multi-Agent Simulation Engine + FastAPI Backend

> **How to use this document:** Hand this file directly to an AI coding agent as the source of truth for the `apps/crewai-engine/` microservice. Phase 1 (Firestore schema + React web portal) is already built. This phase builds the Python backend that Eventarc calls when a batch enters `PENDING_SIMULATION`. 
> 
> **Note to AI Coder:** You are free to write idiomatic Python/FastAPI code. However, you MUST strictly adhere to the data contracts, JSON schemas, mathematical test assertions, and Firestore fields defined in this document. Do not invent your own schemas.

## 0. Objective & Execution Summary

Build a Cloud Run–hosted FastAPI service that runs a sequential three-agent CrewAI pipeline powered by **Google Vertex AI (Gemini)**. The pipeline determines the farmer's best-realizing sales-and-logistics channel using **deterministic Python math for every number that touches money**.

**End-to-End Execution Flow:**
1. **Trigger:** Firestore `inventory_batches/{id}` status changes to `"PENDING_SIMULATION"`.
2. **API Entry:** FastAPI receives `POST /simulate { "batch_id": "..." }` and validates the Firebase Auth ID Token.
3. **CrewAI Pipeline:**
   * **Market Intelligence Agent:** Fetches modal prices (Agmarknet) and filters `buyer_bids` (trust $\ge 3.5$ OR status is PROVISIONAL).
   * **Logistics & Risk Agent:** Fetches distance (Google Routes primary, OSRM fallback), applies backhaul discounts, and looks up decay rates.
   * **Lead Economic Strategist:** Invokes deterministic math for every bid/route combination, ranks by Net Realization, and delegates unsafe routes back to Logistics if needed.
4. **Writeback:** Firestore `ai_recommendations` array is populated, and status flips to `"LISTED_ACTIVE"`.

## 1. Explicit Scope Boundaries

| **IN SCOPE** | **OUT OF SCOPE** | 
| :--- | :--- |
| **FastAPI service** with `POST /simulate` endpoint. | **Telegram Bot ("Hermes"):** Strictly reserved for Phase 3. | 
| **Firebase ID Token Auth** protecting the endpoint. | **Web Portal UI:** React frontend remains untouched. | 
| **CrewAI 3-Agent Pipeline** utilizing Vertex AI Gemini. | **Payment/SMS Gateways:** No money or texts move through this app. | 
| **Pure Deterministic Math Module** (`formulas.py`). | **Eventarc Trigger Deployment:** Assume the caller already exists. | 
| **Firestore Read/Write Sync** (Batches, Bids, Routes). | **Automated Multi-Mandi Physical Auction Execution.** | 
| **Routing Fallbacks** (Google Maps -> OSRM -> Local Matrix). | | 
| **Cloud Run Containerization** (`Dockerfile`). | | 

## 2. Data Contracts & Schemas (STRICT ENFORCEMENT)

To ensure Phase 2 writes exactly what the Phase 1 React portal expects to read, your code must enforce these exact data shapes.

### 2.1 Output Schema: `ai_recommendations`
When updating `inventory_batches/{batch_id}`, the `ai_recommendations` array must contain objects matching this exact structure:
```json
{
  "rank": 1,
  "channel_type": "APMC_MANDI", 
  "channel_name": "Hubballi (Amaragol)",
  "buyer_id": "uid_789", 
  "transporter_id": "uid_321",
  "delivery_term": "FOR_MANDI",
  "gross_revenue": 80000.0,
  "c_logistics": 2300.0,
  "c_mandi": 3600.0,
  "c_shrinkage": 1200.0,
  "p_trust": 1040.0,
  "net_realization": 71860.0,
  "economic_rationale": "High modal price offsets transit costs; 25% backhaul discount applied."
}
```
*(Note: `buyer_id` and `transporter_id` can be null depending on the channel type).*

### 2.2 Fallback Data Files
Your codebase must include a `data/` directory with these exact JSON shapes for offline fallbacks.

**`data/cached_mandi_prices.json`**
```json
{
  "Tomato": {
    "Hubballi": { "modal_price": 2100, "last_updated": "2026-09-20" }
  }
}
```

**`data/horticultural_decay.json`**
*Note: Use the midpoint of `shrinkage_rate_percent_per_100km` for calculations (e.g., Tomato = 1.5).*
```json
{
  "Tomato": { "shrinkage_rate_percent_per_100km": [1.2, 1.8] },
  "Onion": { "shrinkage_rate_percent_per_100km": [0.2, 0.4] }
}
```

**`data/local_distance_matrix.json`**
```json
{
  "Hubballi-Belagavi": { "distance_km": 98.0, "duration_hr": 2.1 }
}
```

## 3. Deterministic Formulas & Traceability

Agents must call these pure functions. They must never compute a rupee figure themselves. 
**Crucial Unit Convention:** Divide the shrinkage percentage by 100 before multiplying into currency values so `C_shrinkage` outputs in rupees (₹).

### 3.1 Traceability of Constants
*   **From Architecture Doc:** $\tau_{\text{cess}} = 0.015$, $\mu_{\text{commission}} = 0.0225$, $\kappa_{\text{buyer}} = 0.05$, $\kappa_{\text{transporter}} = 0.04$, $\delta_{\text{backhaul}} = 0.275$ (if empty return trip).
*   **Assumptions (Needs calibration before Prod):** $\omega_{\text{weighing\_hamali}} = 15.0$ (₹15/qtl), $L_{\text{labor}} = Q \times 20.0$ (₹20/qtl labor rate).

### 3.2 The Equations
1.  **Risk-Adjusted Net Realization:** $NR = \text{Gross Revenue} - C_{\text{logistics}} - C_{\text{mandi}} - C_{\text{shrinkage}} - P_{\text{trust}}$
2.  **Gross Revenue:** $Q \times P_{\text{bid/modal}}$
3.  **Logistics:** $C_{\text{logistics}} = \left( D \times T_{\text{base}} \times (1 - \delta_{\text{backhaul}}) \right) + L_{\text{labor}}$
4.  **Mandi Deductions (Only if FOR_MANDI):** $C_{\text{mandi}} = \text{Gross Revenue} \times (\tau_{\text{cess}} + \mu_{\text{commission}}) + (Q \times \omega_{\text{weighing\_hamali}})$
5.  **Transit Shrinkage:** $C_{\text{shrinkage}} = Q \times \left( \frac{D}{100} \times \frac{\sigma_{\text{crop}}}{100} \right) \times P_{\text{bid/modal}}$
6.  **Trust Penalty:** $P_{\text{trust}} = \left(\text{Gross} \times \max(0, \frac{5 - S_{\text{buyer}}}{5}) \times 0.05\right) + \left(\text{Gross} \times \max(0, \frac{5 - S_{\text{transporter}}}{5}) \times 0.04\right)$

## 4. Agent Roles & Crew Execution Flow

Configure the CrewAI `LLM` class to use Vertex AI (`vertex_ai/gemini-1.5-pro` or `flash`) with `temperature=0.2`.

1. **Market Intelligence Agent (allow_delegation = False):**
   * Uses Market Tools to get modal prices and open bids.
   * Strict Rule: Filter out `buyer_bids` where `buyer_trust_score < 3.5` UNLESS `user_status == "PROVISIONAL"`.
2. **Logistics & Risk Agent (allow_delegation = False):**
   * Uses Routing Tools for distances (Google Maps $\rightarrow$ OSRM $\rightarrow$ Local). Identifies `is_backhaul` flags to apply discounts. Looks up decay rates.
3. **Lead Economic Strategist (allow_delegation = True):**
   * Iterates through every viable channel combination and passes them into the deterministic `formulas.py` functions. Compiles the array ranked by highest $NR$. Uses CrewAI delegation to send highly unsafe routes back to Logistics if needed.

## 5. FastAPI Interface & Idempotency Guards

### 5.1 `POST /simulate` Endpoint
* **Authentication:** Require `Authorization: Bearer <Firebase_ID_Token>`. Use `firebase_admin.auth.verify_id_token`.
* **Request Payload:** `{"batch_id": "string"}`

### 5.2 Strict HTTP Error Handling (The Idempotency Guard)
* `401 Unauthorized`: Missing, invalid, or expired Firebase token.
* `404 Not Found`: `batch_id` does not exist.
* `409 Conflict`: If `inventory_batches/{batch_id}.status != "PENDING_SIMULATION"`. Do not process the batch if it isn't pending.
* `500 Internal Server Error`: Crew execution or formula failure. Batch must be left completely untouched in Firestore so Eventarc can safely retry.

## 6. Firestore Read/Write Lifecycle

1. Fetch `inventory_batches/{batch_id}`. Run the 409 idempotency check.
2. Query `buyer_bids` where `batch_id == {batch_id}` and `status == "OPEN"`. Query `transporter_routes` where `status == "AVAILABLE"`.
3. Run `Crew.kickoff()`.
4. Upon successful execution, execute a single update on the batch document:
   * Populate `ai_recommendations` with the array.
   * Transition `status` to `"LISTED_ACTIVE"`.

## 7. Testing Strategy & Baseline Assertions

You MUST write a unit test (`tests/test_formulas.py`) that strictly validates the following baseline arithmetic to ensure no silent math refactor errors occur.

**Baseline Inputs:**
* $Q = 40$, $P = 2000$, $D = 100$, $T_{\text{base}} = 15$.
* `delivery_term` = `FOR_MANDI`, `is_backhaul` = `False`.
* $\sigma_{\text{crop}} = 1.5$ (Tomato midpoint).
* $S_{\text{buyer}} = 4.5$, $S_{\text{transporter}} = 4.0$.

**Expected Outputs (Assertions MUST equal these exact figures):**
* `Gross Revenue` == 80000
* `C_logistics` == 2300 *( (100 * 15 * 1) + (40 * 20) )*
* `C_mandi` == 3600 *( (80000 * 0.0375) + (40 * 15) )*
* `C_shrinkage` == 1200 *( 40 * (100/100) * (1.5/100) * 2000 )*
* `P_trust` == 1040 *( (80000 * ((5-4.5)/5) * 0.05) + (80000 * ((5-4)/5) * 0.04) )*
* `Net Realization` == 71860

## 8. Definition of Done for Phase 2

1. Calling `POST /simulate` with a valid Firebase ID token and a `batch_id` in `PENDING_SIMULATION` runs the full 3-agent pipeline.
2. Net Realization is computed via `formulas.py` matching the baseline assertions (NO LLM arithmetic anywhere).
3. `ai_recommendations` array matching the exact Section 2.1 schema is written to Firestore and status flips to `LISTED_ACTIVE`.
4. Graceful fallbacks for routing (OSRM/Local) and pricing (JSON cache) are implemented.
5. A second API call on the exact same processed batch safely returns `409 Conflict`.