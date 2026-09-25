# KisaanSaathi AI & CrewAI Engine Troubleshooting Guide (`troubleshootai.md`)

This guide documents the root causes, resolutions, authentication architecture, and setup instructions for running the **CrewAI Multi-Agent Simulation Engine** with **Google Cloud Vertex AI (Gemini 2.5 Flash)**.

---

## 1. Architecture Overview

- **Engine:** CrewAI 0.102+ sequential pipeline with 3 specialized agents:
  1. `Market Intelligence Analyst` (analyzes APMC mandi prices and open B2B bids)
  2. `Logistics & Risk Analyst` (computes road distances, transit decay, backhaul discounts)
  3. `Lead Economic Strategist` (computes net profit, cash flow timelines, margin uplift, and ranks channels)
- **LLM Provider:** Google Cloud Vertex AI (`vertex_ai/gemini-2.5-flash`)
- **Authentication:** Service Account key (`GOOGLE_APPLICATION_CREDENTIALS`) with Google Cloud credits. No consumer API key or Google AI Studio key required.
- **Backend API:** FastAPI exposing `POST /simulate` and `GET /health`

---

## 2. Issues Encountered & How They Were Resolved

### Issue 1: `403 PERMISSION_DENIED: API_KEY_SERVICE_BLOCKED`
- **Symptom:**
  ```text
  google.genai.errors.ClientError: 403 PERMISSION_DENIED.
  Requests to this API generativelanguage.googleapis.com method google.ai.generativelanguage.v1beta.GenerativeService.GenerateContent are blocked.
  Reason: API_KEY_SERVICE_BLOCKED
  ```
- **Root Cause:**
  The API key generated was an **Agent Platform / Vertex AI Search** key, which contains Google Cloud API key restrictions that block direct calls to `generativelanguage.googleapis.com` (Google AI Studio).
- **Resolution:**
  Switched to **Vertex AI native authentication** (`LLM_PROVIDER=vertex_ai`). By using the Firebase Service Account with Vertex AI IAM permissions, the application connects directly through Google Cloud's enterprise Vertex AI endpoint (`aiplatform.googleapis.com`), bypassing consumer API key restrictions and utilizing Google Cloud credits.

---

### Issue 2: `403 PERMISSION_DENIED: Vertex AI API has not been used...`
- **Symptom:**
  ```text
  Vertex AI API has not been used in project kisaansaathi-28cec before or it is disabled.
  ```
- **Root Cause:**
  The Vertex AI API (`aiplatform.googleapis.com`) was not yet enabled in the Google Cloud project, and the service account lacked the appropriate IAM role.
- **Resolution:**
  1. Enabled **Vertex AI API** in Google Cloud Console (`APIs & Services` → `Library` → `Vertex AI API` → `Enable`).
  2. Added the role `Vertex AI User` (`roles/aiplatform.user`) to the service account (`firebase-adminsdk-...@kisaansaathi-28cec.iam.gserviceaccount.com`) in `IAM & Admin`.

---

### Issue 3: `404 NOT_FOUND: Publisher model ... gemini-2.0-flash was not found`
- **Symptom:**
  ```text
  Publisher model `projects/kisaansaathi-28cec/locations/us-central1/publishers/google/models/gemini-2.0-flash` was not found or your project does not have access to it.
  ```
- **Root Cause:**
  In `us-central1`, the model `gemini-2.0-flash` is not exposed under the publisher registry for this project. Querying the live Vertex AI model registry (`client.models.list()`) confirmed available active models include:
  - `gemini-2.5-flash` (Active, recommended)
  - `gemini-2.5-pro`
  - `gemini-3.5-flash`
- **Resolution:**
  Updated `GEMINI_MODEL=gemini-2.5-flash` in `apps/crewai-engine/.env` and `app/config.py`. CrewAI connected and responded immediately with:
  ```text
  CrewAI LLM response: Working!
  ```

---

## 3. How to Set Up Another Device to Continue Development

Follow these steps on any new computer (Windows, macOS, or Linux) to continue development without issues:

### Step 1: Clone the Repository
```bash
git clone https://github.com/Saiesh-Gaonkar/KisaanSaathi.git
cd KisaanSaathi
```

### Step 2: Transfer the Service Account Key (Securely)
> ⚠️ **SECURITY WARNING:** The Firebase service account key JSON is strictly git-ignored and MUST NOT be committed to GitHub.
- Copy your service account JSON file from your primary device (or generate a new one from [Firebase Console](https://console.firebase.google.com/) → *Project Settings* → *Service Accounts* → *Generate New Private Key*).
- Place it anywhere on your machine, e.g.:
  - Windows: `D:\Hackathon\KisaanSaathi\kisaansaathi-28cec-firebase-adminsdk-fbsvc-1a3452a524.json`
  - macOS/Linux: `~/secrets/kisaansaathi-service-account.json`

### Step 3: Configure `apps/crewai-engine/.env`
Navigate to the engine directory and copy the template:
```bash
cd apps/crewai-engine
cp .env.example .env
```
Edit `.env` to match your local file path:
```env
# Path to your service account JSON
GOOGLE_APPLICATION_CREDENTIALS=D:\Hackathon\KisaanSaathi\kisaansaathi-28cec-firebase-adminsdk-fbsvc-1a3452a524.json

# Firebase Project ID
FIREBASE_PROJECT_ID=kisaansaathi-28cec

# Vertex AI Settings
VERTEX_AI_PROJECT=kisaansaathi-28cec
VERTEX_AI_LOCATION=us-central1
GEMINI_MODEL=gemini-2.5-flash
LLM_PROVIDER=vertex_ai

# Optional
GOOGLE_API_KEY=
GOOGLE_MAPS_API_KEY=
AGMARKNET_API_URL=
```

### Step 4: Install Python Dependencies & Verify
Make sure you have **Python 3.10+** (Python 3.11, 3.12, or 3.13 recommended):
```bash
# Inside apps/crewai-engine
python -m venv venv

# Activate Virtual Environment:
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# macOS / Linux:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### Step 5: Run Unit Tests & Sanity Check
Run the test suite to verify all formulas, distance matrix fallbacks, and logic:
```bash
pytest
```
*Expected output: `24 passed`.*

Run a quick Vertex AI connection sanity check:
```bash
python -c "from app.config import settings; llm = settings.get_crewai_llm(); print('CrewAI LLM model:', llm.model)"
```

### Step 6: Start the FastAPI Engine
```bash
uvicorn app.main:app --reload --port 8000
```
- Health Check: `http://localhost:8000/health`
- Interactive Swagger API Docs: `http://localhost:8000/docs`

### Step 7: Run Web Portal (Next.js)
In a separate terminal:
```bash
cd apps/web-portal
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 4. Quick Troubleshooting Matrix

| Error Message | Cause | Solution |
| :--- | :--- | :--- |
| `API_KEY_SERVICE_BLOCKED` | API key restricted / blocked from calling `generativelanguage.googleapis.com` | Set `LLM_PROVIDER=vertex_ai` in `.env` to use the Service Account instead. |
| `Publisher model ... not found (404)` | Model name not available in current region / project | Set `GEMINI_MODEL=gemini-2.5-flash` in `.env`. |
| `PermissionDenied: 403` on Vertex AI | Service account lacks IAM role | Grant `Vertex AI User` (`roles/aiplatform.user`) to the service account in GCP IAM. |
| `google.auth.exceptions.DefaultCredentialsError` | `GOOGLE_APPLICATION_CREDENTIALS` path is wrong or missing | Check `.env` path and make sure file exists at that exact path. |
