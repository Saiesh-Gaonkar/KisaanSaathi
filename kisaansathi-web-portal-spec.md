# KisaanSathi — Phase 1 Build Spec: Web Portal + Firebase Backend

> **How to use this document:** Hand this file directly to an AI coding agent (Cursor, Windsurf, Claude Code, bolt.new, v0, etc.) as the source of truth for scope, data model, and screens. It covers **only** the Tripartite Connect Web Portal and its Firebase backend — nothing else. Build exactly this, no more, no less, unless a section explicitly says to leave room for later.

---

## 0. What We're Building

A three-role web portal (Farmer / Wholesaler-Buyer / Transporter) backed entirely by Firebase (Firestore + Firebase Authentication), where:

- Farmers register harvested crop batches
- Wholesalers/buyers browse active batches and place bids
- Transporters declare available routes/capacity
- Farmers accept a bid and a transporter, forming a "deal"
- Deal fulfillment is verified with a two-step PIN handshake, which then unlocks mutual reviews and updates trust scores

This is the foundational data layer and UI for the larger KisaanSathi ecosystem. Get this right and self-consistent — later phases (a Telegram AI co-pilot and a multi-agent recommendation engine) will read and write into the same Firestore collections without needing this portal rebuilt.

### Why start here

Establishing Firestore first creates the shared state engine and data schemas (`users`, `inventory_batches`, `buyer_bids`, `transporter_routes`, `deals_and_reviews`) that every later phase depends on. Building the three frontend dashboards (Farmer, Buyer, Transporter) alongside it isn't just UI polish — it's the working tool for seeding test data, posting bids, declaring routes, and watching real-time state updates propagate through Firestore, without needing the bot or the agent engine built yet to verify the data model actually holds together end to end.

---

## 1. Explicitly OUT of Scope for This Build

Do **not** build any of the following. Leave clean seams for them (see Section 8), but do not implement them:

| Excluded                                                                     | Why                                                                                          |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Payment gateway (Razorpay, Stripe, UPI deep-links, etc.)                     | Not needed yet — deal "value" fields are records only, no money moves through the app       |
| Telegram bot ("Hermes")                                                      | Separate later phase                                                                         |
| CrewAI / any LLM-based multi-agent reasoning                                 | Separate later phase                                                                         |
| Live OSRM / Google Maps distance & routing calls                             | Later phase — store distance/duration as plain manual-entry numbers for now, or leave blank |
| SMS/voice notifications beyond what Firebase Phone Auth itself sends for OTP | Later phase                                                                                  |
| Any automatic price-feed integration (Agmarknet/data.gov.in)                 | Later phase — modal price can be a manual input field on the bid form for now               |

If you're ever unsure whether something belongs in this build, default to **not building it** and leaving a clearly labeled stub/placeholder instead.

---

## 2. Tech Stack

- **Frontend:** React + Vite, React Router for role-based routing, Tailwind CSS for styling
- **Backend:** Firebase only — Firestore (database) + Firebase Authentication (Phone OTP) + Firebase Hosting for deployment
- **No custom backend server** — the web app talks to Firestore directly via the Firebase SDK, governed by Firestore Security Rules (Section 5)
- **Language:** TypeScript preferred if the agent defaults to it; plain JS is acceptable

---

## 3. Roles & Authentication

Three roles: `farmer`, `wholesaler`, `transporter`.

-  - **Sign-in method:** Google Sign-In (via Firebase Authentication). Do not implement Phone Auth to avoid SMS costs.
  - **First-time flow:** Google Sign-In button → short profile form (name pre-filled from Google, role selection, village/district location) → profile written to `users/{uid}`.
- **New user defaults:** every new user is created with:

  - `user_status: "PROVISIONAL"`
  - `trust_score: 3.5`
  - `completed_deals_count: 0`

  This "provisional" baseline exists so that once a future recommendation engine starts filtering by trust score (e.g. "only show bids above 3.5★"), brand-new users aren't automatically locked out. Preserve these defaults exactly even though nothing reads/enforces the filter yet.
- **Routing:** unauthenticated users → phone login screen. Authenticated users with no completed profile → profile form. Authenticated + profiled users → their role's dashboard (`/farmer`, `/wholesaler`, `/transporter`). Users cannot access another role's dashboard routes.

---

## 4. Firestore Data Model

Five top-level collections. Field names and types below are the contract — keep them exact so future phases (which write into the same collections) don't break.

### `users/{uid}`

```ts
{
  uid: string
  role: "farmer" | "wholesaler" | "transporter"
  user_status: "PROVISIONAL" | "VERIFIED"
  name: string
  email: string                               // Replaces phone
  location: { village_or_district: string }   
  trust_score: number      
  completed_deals_count: number
  created_at: timestamp
}
```

### `inventory_batches/{batch_id}`

```ts
{
  batch_id: string
  farmer_id: string           // ref -> users
  crop: string                 // e.g. "Tomato"
  variety: string
  quantity_qtl: number
  harvest_date: timestamp
  status: "DRAFT" | "PENDING_SIMULATION" | "LISTED_ACTIVE" | "MATCHED_IN_TRANSIT" | "FULFILLED"
  ai_recommendations: array | null   // ALWAYS write this field as null/empty for now — see Section 8
  created_at: timestamp
}
```

### `buyer_bids/{bid_id}`

```ts
{
  bid_id: string
  batch_id: string             // ref -> inventory_batches
  buyer_id: string              // ref -> users
  offered_price_per_qtl: number
  delivery_term: "EX_FARM" | "FOR_MANDI"
  buyer_trust_snapshot: number  // copy of buyer's trust_score at time of bid
  status: "OPEN" | "ACCEPTED" | "REJECTED"
  created_at: timestamp
}
```

### `transporter_routes/{route_id}`

```ts
{
  route_id: string
  transporter_id: string        // ref -> users
  vehicle_type: string           // e.g. "Tata 407 (3.5T)"
  capacity_qtl: number
  origin: string
  destination: string
  is_backhaul: boolean
  tariff_per_km: number
  transporter_trust_snapshot: number
  status: "AVAILABLE" | "CLAIMED"
  created_at: timestamp
}
```

### `deals_and_reviews/{deal_id}`

```ts
{
  deal_id: string
  batch_id: string
  farmer_id: string
  buyer_id: string
  transporter_id: string
  agreed_price_per_qtl: number
  status: "MATCHED" | "PICKUP_VERIFIED" | "FULFILLED"
  verification_pins: {
    farmgate_otp: string        // generated on deal creation
    scale_otp: string           // generated on deal creation
    farmgate_verified: boolean
    scale_verified: boolean
  }
  ratings: {
    farmer_to_buyer: number | null
    farmer_to_transporter: number | null
    buyer_to_farmer: number | null
    transporter_to_farmer: number | null
  } | null
  created_at: timestamp
  fulfilled_at: timestamp | null
}
```

---

## 5. Firestore Security Rules (conceptual — implement in `firestore.rules`)

- `inventory_batches`: only the owning farmer can create/update their batch. Any authenticated wholesaler/transporter can **read** batches with `status == "LISTED_ACTIVE"`. The owning farmer can read all statuses of their own batch.
- `buyer_bids`: any authenticated wholesaler can create a bid. Only the bidding wholesaler and the farmer who owns the referenced batch can read a given bid.
- `transporter_routes`: only the owning transporter can create/update their route. Farmers and wholesalers can read routes with `status == "AVAILABLE"`.
- `deals_and_reviews`: only the three parties named on the deal (`farmer_id`, `buyer_id`, `transporter_id`) can read or write it.

- `users/{uid}`: any authenticated user can read `name`, `role`, `trust_score`, `completed_deals_count` (public reputation fields); only the user themself can read/write `email` and edit their own doc.

Implement these as real `firestore.rules`, not just client-side checks — the client-side role gating in Section 3 is a UX convenience, not security.

---

## 6. Screens

### 6.1 Shared




- `/login — Google Sign-In button (No OTP entry)`
- `/onboarding` — first-time profile form (name, role, location)
- Role-aware top nav / sidebar showing the signed-in user's name, role, and trust score



### 6.2 Farmer Dashboard (`/farmer`)

- List of the farmer's own `inventory_batches`, with status badges
- **"Register Harvest" form** → creates a new `inventory_batches` doc with `status: "DRAFT"`, then immediately advances it to `"PENDING_SIMULATION"` on submit. (Nothing will act on `PENDING_SIMULATION` yet in this phase — that's expected, not a bug. See Section 8.)
- **Batch detail view** (`/farmer/batch/:id`):
  - If `ai_recommendations` is present, render it as ranked cards (build the UI, even though nothing populates this field yet)
  - If empty/null, show a plain "No AI recommendation yet" state
  - **Below that, always show the raw data so the farmer can decide manually right now:** list of open `buyer_bids` on this batch (price, delivery term, buyer name + trust score) and list of `AVAILABLE` `transporter_routes` near the batch's location (vehicle, capacity, tariff, transporter trust score)
  - "Accept" button next to a bid and a route → triggers the booking flow (Section 7)

### 6.3 Wholesaler / Buyer Dashboard (`/wholesaler`)

- Marketplace view: all `inventory_batches` with `status == "LISTED_ACTIVE"`, filterable by crop
- Bid form on a batch: price per quintal + delivery term toggle (`EX_FARM` / `FOR_MANDI`) → creates a `buyer_bids` doc
- "My Bids" list with live status (`OPEN` / `ACCEPTED` / `REJECTED`)
- Profile panel showing own `trust_score` and `completed_deals_count`

### 6.4 Transporter Dashboard (`/transporter`)

- "Declare Route" form: origin, destination, vehicle type, capacity, tariff per km, backhaul toggle → creates a `transporter_routes` doc with `status: "AVAILABLE"`
- "My Routes" list with status (`AVAILABLE` / `CLAIMED`)
- Profile panel showing own `trust_score` and `completed_deals_count`

---

## 7. Booking / Deal Flow (the core transaction system)

This is the heart of the "booking system." Implement it as the exact state progression below — don't invent a different flow.

```
[DRAFT] → [PENDING_SIMULATION] → [LISTED_ACTIVE] → [MATCHED_IN_TRANSIT] → [FULFILLED]
```

1. **Booking:** From the batch detail view, the farmer selects one open bid and one available route and taps Accept. This:
   - Creates a `deals_and_reviews` doc with `status: "MATCHED"`, two freshly generated random PINs in `verification_pins`, and both `verified` flags `false`
   - Sets the chosen `buyer_bids.status → "ACCEPTED"` (and the rest of that batch's open bids → `"REJECTED"`)
   - Sets the chosen `transporter_routes.status → "CLAIMED"`
   - Sets `inventory_batches.status → "MATCHED_IN_TRANSIT"`
2. **Farmgate pickup verification:** on the transporter's dashboard, an "Enter Farmgate PIN" field on the active deal. When the PIN matches `verification_pins.farmgate_otp`, set `verification_pins.farmgate_verified = true` and `deal.status → "PICKUP_VERIFIED"`.
3. **Delivery verification:** on the buyer's dashboard, an "Enter Delivery PIN" field on the deal. When it matches `verification_pins.scale_otp`, set `scale_verified = true`.
4. **Fulfillment:** once both PINs are verified, set `deal.status → "FULFILLED"`, `fulfilled_at = now`, and `inventory_batches.status → "FULFILLED"`. This unlocks the review step.
5. **Reviews:** each of the three parties gets a simple 1–5 star rating form for the other party/parties on that deal, written into `ratings`. On each rating submission, recompute the rated user's `trust_score` (simple running average is fine) and increment `completed_deals_count`.

This whole flow works with **zero AI involvement** — it's a plain CRUD + state machine app. That's intentional for this phase.

---

## 8. Forward-Compatibility Notes (read before building)

Later phases will plug an AI recommendation engine and a Telegram bot into this exact Firestore backend. To avoid rework later:

- Always write `ai_recommendations` as `null` (or an empty array) when a batch is created. Build the "ranked cards" UI to render *if* that field is populated, but never make it required for the booking flow to work — the manual bid/route browsing in Section 6.2 is the real booking mechanism for this phase.
- Keep the `"PENDING_SIMULATION"` status value in the state machine even though nothing consumes it yet — a future Cloud Function will watch for it.
- Always snapshot `buyer_trust_snapshot` / `transporter_trust_snapshot` on bids/routes at creation time, even though no risk-penalty math runs on them yet.
- Don't rename any collection or field from Section 4 — later phases read/write these exact names.

---

## 9. Non-Functional Requirements

- **Mobile-first, responsive.** Buyers and transporters are plausibly using this from a phone in the field, not just farmers.
- **Currency:** always display as ₹ with Indian digit grouping (e.g. `₹74,200`, not `₹74200`).
- **Firebase config** via environment variables (`VITE_FIREBASE_*`), never hardcoded in source.
- **No local mock data in production paths** — Firestore is the single source of truth. For development only, see Section 10.

---

## 10. Seed Data (development only)

Because this is a three-sided marketplace, it will look completely empty on first run — no bids, no routes, nothing to demo. Write a small seed script (run once against a dev/test Firebase project, never production) that creates:

- 2 farmer users, 2 wholesaler users, 2 transporter users
- 2–3 `inventory_batches` (status `LISTED_ACTIVE`) for the farmer users
- 2–3 `buyer_bids` against those batches
- 2–3 `transporter_routes`

This makes every dashboard demonstrable immediately instead of starting from an empty database.

---

## 11. Suggested Folder Structure

```
web-portal/
├── src/
│   ├── components/
│   │   ├── farmer/
│   │   ├── wholesaler/
│   │   ├── transporter/
│   │   └── shared/         # nav, auth screens, PIN entry, rating form
│   ├── services/
│   │   └── firebase.ts     # Firebase init, Firestore + Auth helpers
│   ├── hooks/               # e.g. useAuth, useUserProfile
│   ├── routes/               # role-based route guards
│   └── App.tsx
├── firestore.rules
├── seed/
│   └── seed.ts              # Section 10 seed script
├── .env.example
└── package.json
```

---

## 12. Definition of Done for Phase 1

- A farmer can sign up, register a harvest batch, see bids and routes against it, accept one of each, and the deal progresses through the full state machine to `FULFILLED` with PIN verification and mutual reviews — entirely through Firebase, with no AI, no bot, and no payment involved anywhere in the flow.
