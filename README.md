# **Project Title: KisaanSathi**

## **1\. The Problem Statement: The Post-Harvest Distress Dilemma**

India suffers an estimated ₹1.53 lakh crore (USD 18.5 billion) in agricultural losses annually, primarily due to post-harvest inefficiencies. For smallholder and marginal farmers, harvest day introduces a critical economic blind spot.

Currently, farmers lack the data to calculate the true net value of their crops across different selling channels. They are forced to guess whether to sell immediately at the farmgate (often falling victim to predatory pricing and "distress selling"), pay for logistics to reach a regional APMC market, or incur storage fees to wait for better rates.

Furthermore, there is a massive information vacuum. Farmers, local buyers (like restaurants and wholesale traders), and transport agents operate in silos. This lack of coordination results in empty truck backhauls, buyers struggling to source verified quality produce, and massive quantities of perishable goods rotting at the farm level before a profitable match can be made.

## **2\. Our Solution Approach: The Tripartite Ecosystem**

KisanSathi is an AI-driven, multi-agent ecosystem designed to eliminate post-harvest distress sales by bridging the gap between agricultural effort and true market value. We are providing a suite of interconnected services:

### **A. The Conversational AI Co-Pilot (Farmer Frontend)**

An always-on, intelligent assistant accessible entirely through familiar messaging apps like Telegram or Telegram. Farmers do not need to download a new app or learn a complex dashboard. They simply chat with the AI in natural language to log their harvest, ask for market rates, or request selling advice.

### **B. The Tripartite Connect Portal (Web Platform)**

A centralized web directory and marketplace designed for three key stakeholders:

* **Buyers/Vendors (Restaurants, Traders):** Can view real-time, aggregated local crop inventories and make direct bids based on verified farmer profiles.
* **Transport Agents:** Can view heatmaps of harvest clusters and actively list empty truck capacity or return routes, solving the deadhead logistics problem.
* **Farmers:** Gain access to a broader market of verified buyers without relying on middlemen.

### **C. Passive Digital Identity & Reputation Engine**

Farmers receive a rich digital profile on the web portal without manually maintaining it. When a farmer casually texts the AI Co-Pilot about a harvest or a completed sale, the AI acts as a backend administrator, automatically updating the farmer's inventory, status, and transaction history on the web portal. Completed transactions generate a trust/quality score, allowing high-performing farmers to command premium prices.

### **D. Practical Economic Consequence Modeling**

Before a farmer makes a selling decision, the system runs an invisible background simulation. It calculates the *exact net realization*—taking the gross market price and deducting dynamic freight costs, toll fees, mandi commissions, storage rentals, and predicted spoilage decay. It then translates these complex mathematics into a simple, actionable text message recommending the most profitable route.

**3\. The End-to-End Concept in Action**

Here is the exact workflow connecting all three pieces:

1. **Input:** The farmer texts Telegram: *"I just harvested 40 quintals of tomatoes. Sell now or wait?"*
2. **Reception & Database Update:** Hermes receives the text via its messaging gateway, identifies the farmer using its memory, and automatically updates their active inventory directly in the Firebase database.
3. **Delegation:** Hermes recognizes the query requires a market simulation. It uses a custom tool call to execute the CrewAI Python script.
4. **Multi-Agent Simulation:** CrewAI spins up its specialized task force. The agents pull live transport rates and dealer bids from Firebase, debate the trade-offs (e.g., transport cost vs. immediate farmgate cash), and mathematically calculate the net realization.
5. **Handoff:** CrewAI returns a structured JSON summary of the most profitable option back to Hermes.
6. **Delivery:** Hermes translates that JSON data into a friendly, localized Telegram message and sends the final advisory back to the farmer.

This architecture keeps the heavy reasoning (CrewAI) isolated and mathematically precise, while keeping the user experience (Hermes) frictionless and conversational.

Here is how the three backend CrewAI agents structurally adapt to this update conceptually, focusing entirely on their psychological setup and constraints without using code.

### **1\. Market Intelligence Agent**

* **Role:** APMC & Direct Buyer Bid Analyst.
* **Goal:** Extract Agmarknet modal rates and query active buyer bids, strictly filtering out any Wholesaler with a trust score below your baseline (e.g., 3.5 stars).
* **Backstory:** This agent's persona remains focused exclusively on the demand side. Its backstory emphasizes that it only audits *buyer* integrity (history of payment defaults or arbitrary quality rejections). It ignores how the crop gets there, trusting the Logistics agent to handle the physical movement.
* **Delegation (`allow_delegation=False`):** It cannot ask for help. It must deterministically pull prices and buyer scores directly from the database using its assigned tools.
* **Validation:** Its output must strictly pass a schema that includes a `buyer_trust_score`. If it tries to pass a bid to the next agent without a verified rating attached, the framework rejects it.
* **Verbose (`verbose=True`):** In the terminal, you will see it actively logging which Wholesaler bids were discarded due to poor payment histories.

### **2\. Logistics & Risk Agent (The Major Update)**

* **Role:** Freight Dispatcher & Transporter Trust Auditor.
* **Goal:** Compute road distances, identify empty backhaul trucks, and strictly match harvest loads to Transporters who meet minimum safety and punctuality thresholds.
* **Backstory:** The backstory is heavily expanded here. The agent is instructed that a cheap freight rate is economically useless if the driver has a 2-star rating for crushing perishable cargo. It acts as the protective barrier for the farmer's physical yield, balancing the cost per kilometer against the driver's historical reliability and cargo care.
* **Delegation (`allow_delegation=False`):** It executes exact routing and filtering tools sequentially to map the physical trucks available.
* **Validation:** The output schema is updated to mandate a `transporter_trust_score` variable. It cannot just pass a flat freight cost to the Economic Agent; it must pass the cost *and* the driver's exact rating.
* **Verbose (`verbose=True`):** It will print its filtering logic to the console, such as explicitly bypassing a cheap ₹12/km truck with a 1.5-star rating in favor of a ₹14/km truck with a 4.9-star rating.

### **3\. Lead Economic Strategist (The Decision Engine)**

* **Role:** Chief Agricultural Economist & Risk-Adjusted Strategist.
* **Goal:** Deduct all logistical and statutory fees from the gross bid, and apply mathematical risk penalties using the dual-trust matrix (Wholesaler Score \+ Transporter Score) to determine the safest, most profitable route.
* **Backstory:** This agent's worldview now includes physical transit risk. It is instructed to mathematically penalize cheap, risky options. It must compute whether the guaranteed safe arrival of Grade-A produce with a 5-star transporter outweighs the minor savings of using a 3-star transporter who might cause 5% bruising damage (which would lower the final payout from the buyer).
* **Delegation (`allow_delegation=True`):** This is where delegation becomes highly effective. If the Logistics Agent passes a route where the only available transporter has a terrible safety rating, the Economic Agent can reject the calculation and delegate a task back to the Logistics Agent: *"This transporter score is too high-risk for a perishable crop. Re-query the database for a different vehicle class or a slightly further origin point to find a safer driver."*
* **Validation:** The final recommendation schema now requires an `economic_rationale` string that explicitly explains the trust trade-off to the farmer.
* **Verbose (`verbose=True`):** It logs the real-time debate between raw profit margin and trust-score risk penalties before finalizing the advice.

By structurally separating the trust scores—assigning Wholesaler trust to the Market Agent and Transporter trust to the Logistics Agent—the Lead Economic Agent receives a perfectly balanced, dual-risk dataset. This ensures the final advice given to the farmer optimizes for both maximum profit and maximum physical safety.

The tripartite portal acts as a single, synchronized exchange built on top of Google Firebase. By using Firestore as the common state engine, the three human user types (Farmers, Wholesalers, Transporters) and the AI agents read and write to the same live data collections without custom WebSocket infrastructure.

### **1\. The Three Integrated Portal Views**

Rather than three separate applications, the portal is a single web application with role-based dashboards tied to Firebase Authentication:

* **Farmer Dashboard (The Visual Twin of Hermes):**

  * Displays active crop batches registered either via Telegram (through Hermes) or directly on the web.
  * Shows a real-time **Advisory Card** for each batch, displaying the CrewAI engine's ranked recommendations (e.g., "Sell to Buyer X at farmgate" vs. "Ship to Hubballi Mandi with Transporter Y").
  * Features a one-click "Accept Offer" button that converts an AI recommendation into an active contract.
* **Wholesaler / Buyer Exchange:**

  * A searchable marketplace of live crop batches with verified harvest dates and quality grades.
  * A bidding panel where buyers submit price offers with the critical **Delivery Term Toggle**:

    * *Ex-Farm:* Wholesaler handles pickup.
    * *FOR Mandi:* Farmer delivers to the mandi gate.
  * Displays farmer trust scores and historical grading accuracy.
* **Transporter Dispatch Board:**

  * A live freight board showing farmers who need crop transport along specific corridors.
  * A **Route Declaration Tool** where drivers log upcoming trips (e.g., "Returning empty from Belagavi to Hubballi at 4 PM").
  * Logging an empty trip flags a **Backhaul Discount**, notifying the Logistics Agent to match the driver with nearby farmers along that corridor.

### **2\. Firestore Data Model (The Shared State)**

To allow the AI agents and portal users to interact seamlessly, Firestore organizes data into five core collections:

| Collection          | Key Fields                                                                                                        | Primary Writers           | Primary Readers               |
| :------------------ | :---------------------------------------------------------------------------------------------------------------- | :------------------------ | :---------------------------- |
| users               | uid, role, name, phone, location\_coords, trust\_score, completed\_deals\_count                                   | User Auth / Review System | All Agents & Users            |
| inventory\_batches  | batch\_id, farmer\_id, crop, variety, quantity\_qtl, harvest\_date, status, ai\_recommendations                   | Hermes Agent / Farmer     | Buyer, Transporter, AI Agents |
| buyer\_bids         | bid\_id, batch\_id, buyer\_id, offered\_price\_per\_qtl, delivery\_term, buyer\_trust\_snapshot, status           | Wholesaler                | Market Agent, Farmer          |
| transporter\_routes | route\_id, transporter\_id, vehicle\_type, capacity\_qtl, origin, destination, is\_backhaul, tariff\_per\_km      | Transporter               | Logistics Agent               |
| deals\_and\_reviews | deal\_id, batch\_id, farmer\_id, buyer\_id, transporter\_id, agreed\_price, ratings: {farmer, buyer, transporter} | Portal Deal Flow          | Trust Engine / All Agents     |

### **3\. How AI Agents Ingest and Act on Firebase Data**

The multi-agent system does not run continuously in an infinite loop; it is **event-driven**. When state changes occur in Firestore, the AI agents execute targeted workflows:

\[Farmer posts harvest / asks Telegram\]                │                ▼   (Hermes writes /updates batch in Firestore)                │                ▼      \[Trigger: CrewAI Simulation\]        ├── Market Agent reads \`buyer\_bids\` & filters by \`users.trust\_score\`        ├── Logistics Agent reads \`transporter\_routes\` & matches backhauls        └── Economic Agent calculates Net Realization & outputs Ranked Options                │                ▼ (Writes back to \`inventory\_batches/{id}/ai\_recommendations\`)                │         ┌──────┴──────┐         ▼             ▼\[Portal Dashboard\]  \[Hermes Telegram\](Live sync via      (Alerts farmer with onSnapshot)         clear voice/text)

1. **Harvest Registration:** When a farmer texts Hermes on Telegram, Hermes writes a document into inventory\_batches with status: "PENDING\_SIMULATION".
2. **Market Intelligence Ingestion:** The Market Agent queries buyer\_bids for that crop, fetches the buyer's current rating from users, discards any bids below 3.5 stars, and pairs the remaining bids with live APMC benchmark prices.
3. **Logistics Ingestion:** The Logistics Agent queries transporter\_routes for vehicles located within range of the farmer's coordinates. It checks for is\_backhaul \== true to apply freight discounts and checks the driver's safety rating.
4. **Recommendation Injection:** The Economic Agent calculates the net realization across all valid combinations and writes a structured array directly into the inventory\_batches/{batch\_id}/ai\_recommendations field.
5. **Instant Portal Update:** Because the frontend uses Firebase's real-time listeners (onSnapshot), the farmer's dashboard updates immediately with the ranked options—no page refresh required. Simultaneously, Hermes reads the top option and sends a Telegram audio/text summary back to the farmer.

### **4\. The Closed-Loop Reputation Engine**

Trust scores cannot be static text; they must dynamically alter future recommendations:

1. **Fulfillment:** Once a delivery is completed at the mandi or farmgate, the portal unlocks a simple 3-question evaluation screen for all three participants.
2. **Aggregation:** When reviews are submitted to deals\_and\_reviews, a background calculation recalculates each party's aggregate trust\_score in their users document.
3. **Dynamic Filtering:** If a transporter's score drops from 4.2 to 2.8 due to cargo bruising complaints, the Logistics Agent automatically stops selecting that driver for fragile crops in all subsequent runs across the platform.

This architecture turns Firebase into an active coordinator: human users supply bids, capacity, and ratings through the portal, while the AI agents autonomously parse that data to compute the safest, most profitable post-harvest decisions.

Apart  from these some more important  things to consider  the conceptual working **4\. Deterministic Formulas & Trust-Penalty Math**
To prevent the Large Language Models from hallucinating economic calculations, the CrewAI Economic Agent strictly executes the following deterministic formulas.
The ultimate goal is to compute the risk-adjusted Net Realization:

### **![][image1]Sub-Calculations:**

> * **Logistics Cost:** Factors in dynamic routing and empty backhaul discounts.![][image2]
> * **Mandi Deductions (Statutory & Labor):**![][image3]
> * **Transit Shrinkage Cost (Perishability):**![][image4]
> * **Trust Risk Penalty (Quantifying the Human Risk):** A mathematical markdown applied to bids from lower-rated counterparties to reflect the financial risk of payment delays or cargo damage.
>   ![][image5]
>   *(e.g., A buyer with a 3.0 rating incurs a 5% discount penalty against their gross offer, making a slightly lower bid from a reliable 5.0-rated buyer mathematically superior).*

## **5\. Horticultural Decay & Benchmark Matrix**

The Logistics Agent utilizes this static reference table to calculate Transit Shrinkage and storage trade-offs for varying commodities.

| Crop                   | Baseline Shelf-Life (Ambient) | Max Cold Storage Duration | Shrinkage Rate (% weight loss / 100 km) | Avg. Cold Storage Rent (₹ / Quintal / Mo) |
| :--------------------- | :---------------------------- | :------------------------ | :-------------------------------------- | :----------------------------------------- |
| **Tomato**       | 3 – 5 Days                   | 21 Days                   | 1.2% – 1.8%                            | ₹110 – ₹130                             |
| **Onion**        | 30 – 45 Days                 | 180 Days                  | 0.2% – 0.4%                            | ₹75 – ₹90                               |
| **Green Chilli** | 4 – 6 Days                   | 28 Days                   | 2.0% – 2.5%                            | ₹130 – ₹150                             |
| **Potato**       | 20 – 30 Days                 | 240 Days                  | 0.1% – 0.3%                            | ₹80 – ₹100                              |

## **6\. External API Contracts & Fail-Safe Strategy**

The agents rely on two primary external APIs, safeguarded by strict offline fallbacks to ensure platform stability.

> * **Primary Price Feed (Data.gov.in OGD REST API):**

* *Endpoint:* https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
* *Key Output Fields:* state, district, market, commodity, variety, arrival\_date, modal\_price.

> * **Logistics & Distance Feed (OSRM):**

* *Endpoint:* http://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=false
* *Key Output Fields:* routes\[0\].distance (meters to km), routes\[0\].duration (seconds to transit hours).

> * **Offline Fallback Mode (Crucial for Reliability):**

* If the Data.gov.in API times out, the Market Agent automatically falls back to an internal cached\_mandi\_prices.json file rather than crashing the execution.

## **7\. Hermes Telegram Tool Definitions**

The Hermes conversational gateway operates using a specific set of predefined tools to interact with the Firestore backend:

> * register\_harvest\_batch: Ingests crop type, estimated weight (quintals), harvest date, and quality tier. Generates a new Firestore record under inventory\_batches.
> * query\_economic\_advisor: Triggered when the farmer asks for a decision ("Should I sell now or wait?"). Emits an event payload to invoke the background CrewAI simulation.
> * accept\_contract: Confirms an offer selected by the farmer, locking the inventory and updating the bid status to ACCEPTED.
> * get\_farmer\_profile: Retrieves the farmer’s village location, historical yields, and trust standing based on their unique telegram\_chat\_id.

## **8\. Inventory State Machine & Failure Modes**

To prevent duplicate selling or race conditions on the tripartite portal, every crop batch strictly follows this state lifecycle:\[DRAFT\] ──\> \[PENDING\_SIMULATION\] ──\> \[LISTED\_ACTIVE\] ──\> \[MATCHED\_IN\_TRANSIT\] ──\> \[FULFILLED\]

> * **Edge Case \- No Transporter Available:** If a farmer selects an APMC route but no transporter accepts the bid within a predefined window, the system automatically alerts the farmer via Telegram and recalculates the best available Farmgate pickup option.
> * **Edge Case \- Gluts and Distress Selling:** If Agmarknet modal prices crash by \>20% week-on-week due to heavy market arrivals, the Economic Agent triggers a "Glut Warning," advising cold storage or alternative regional mandis where supply volumes remain low.

## **9\. Transaction Verification & Anti-Gaming Rules**

To maintain the integrity of the Tripartite Reputation Engine, reviews cannot be left arbitrarily.

> * **The Digital Handshake (OTP / QR Code):** A review prompt is only unlocked when:

1. The transporter enters a verification PIN provided by the farmer at physical farmgate pickup.
2. The wholesaler enters a delivery confirmation PIN provided by the transporter at the mandi scale.

> * **Anti-Collusion Guard:** A farmer and buyer cannot continuously rate each other 5 stars to artificially inflate ratings without a corresponding physical delivery record logged by a verified, independent transporter.

[image1]: data:image/png;base64,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
[image2]: data:image/png;base64,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
[image3]: data:image/png;base64,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
[image4]: data:image/png;base64,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14ei2jmSM36E4v5V/fhVi1wREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREZEflv8B1/rAfghgqLQAAAAASUVORK5CYII=
[image5]: data:image/png;base64,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
