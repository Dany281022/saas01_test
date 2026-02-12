# api/consultation.py
import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer, HTTPAuthorizationCredentials
from openai import OpenAI

app = FastAPI(title="MediNotes Consultation API")

# -------------------------
# CORS (autoriser le frontend Vercel)
# -------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # remplacer "*" par ton domaine frontend pour plus de sécurité
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# Clerk Auth
# -------------------------
clerk_config = ClerkConfig(jwks_url=os.getenv("CLERK_JWKS_URL"))
clerk_guard = ClerkHTTPBearer(clerk_config)

# -------------------------
# Request Model
# -------------------------
class Visit(BaseModel):
    patient_name: str
    date_of_visit: str
    notes: str

# -------------------------
# System Prompt
# -------------------------
system_prompt = """
You are provided with notes written by a doctor from a patient's visit.
Your job is to summarize the visit for the doctor and provide an email.

Reply with exactly three sections with the headings:

### Summary of visit for the doctor's records
### Next steps for the doctor
### Draft of email to patient in patient-friendly language
"""

# -------------------------
# Prompt Builder
# -------------------------
def user_prompt_for(visit: Visit) -> str:
    return f"""Create the summary, next steps and draft email for:

Patient Name: {visit.patient_name}
Date of Visit: {visit.date_of_visit}

Notes:
{visit.notes}
"""

# -------------------------
# API Endpoint
# -------------------------
@app.post("/api/consultation")
def consultation_summary(
    visit: Visit,
    creds: HTTPAuthorizationCredentials = Depends(clerk_guard),
):
    # Vérification Auth
    if not creds:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = creds.decoded.get("sub", "unknown_user")

    # Vérification OpenAI Key
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set")

    client = OpenAI(api_key=openai_key)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt_for(visit)},
    ]

    try:
        # Requête OpenAI
        response = client.chat.completions.create(
            model="gpt-5-nano",
            messages=messages,
        )

        # Extraire le texte renvoyé par OpenAI
        summary_text = ""
        if response.choices and len(response.choices) > 0:
            summary_text = response.choices[0].message.content

        return {"summary": summary_text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI error: {str(e)}")
