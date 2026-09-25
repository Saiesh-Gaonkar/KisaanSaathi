import os
import sys
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

print("=" * 60)
print("TESTING LLM AUTHENTICATION MODES")
print("=" * 60)

# Mode 1: Google AI Studio API Key (Consumer API)
api_key = os.environ.get("GOOGLE_API_KEY", "")
print(f"\n1. Testing Consumer Google API Key: {api_key[:10]}...{api_key[-5:] if api_key else ''}")
try:
    from google import genai
    client = genai.Client(api_key=api_key)
    res = client.models.generate_content(
        model="gemini-2.5-flash",
        contents="Say 'Google API Key works!' in 5 words.",
    )
    print("   [RESULT] SUCCESS:")
    print("   -->", res.text.strip())
except Exception as e:
    print("   [RESULT] BLOCKED / FAILED:")
    print("   -->", str(e)[:300])

# Mode 2: Vertex AI (Service Account & GCP Credits)
print("\n2. Testing Vertex AI Enterprise Endpoint with Service Account...")
try:
    import litellm
    res = litellm.completion(
        model="vertex_ai/gemini-2.5-flash",
        messages=[{"role": "user", "content": "Say 'Vertex AI works!' in 5 words."}],
        project=os.environ.get("VERTEX_AI_PROJECT", "kisaansaathi-28cec"),
        location=os.environ.get("VERTEX_AI_LOCATION", "us-central1"),
    )
    print("   [RESULT] SUCCESS:")
    print("   -->", res.choices[0].message.content.strip())
except Exception as e:
    print("   [RESULT] FAILED:")
    print("   -->", str(e)[:300])

print("\n" + "=" * 60)
