import os
from fastapi import FastAPI, Depends  # type: ignore
from fastapi.responses import StreamingResponse  # type: ignore
from pydantic import BaseModel  # type: ignore
from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer, HTTPAuthorizationCredentials  # type: ignore
from openai import OpenAI  # type: ignore

app = FastAPI()
clerk_config = ClerkConfig(jwks_url=os.getenv("CLERK_JWKS_URL"))
clerk_guard = ClerkHTTPBearer(clerk_config)

class Visit(BaseModel):
    patient_name: str
    date_of_visit: str
    notes: str

# AJUSTEMENT : On force l'IA à inclure les champs spécifiques de l'image
system_prompt = """
You are a medical scribe. Summarize the visit and draft an email. 
You MUST reply with exactly these three sections and headers:

### Summary of visit for the doctor's records
Patient Name: [Name]
Date of Visit: [Date]
Reason for Visit: [Reason]
Key Observations: [Observations]

### Next steps for the doctor
1. [Step 1]
2. [Step 2]

### Draft of email to patient in patient-friendly language
Dear [Name],
[Email content in 2 paragraphs]

Take care,
[Doctor's Name]
[Doctor's Contact Information]

IMPORTANT: Do not add extra empty lines between Patient Name, Date, Reason, and Observations.
"""

def user_prompt_for(visit: Visit) -> str:
    return f"""Create the summary, next steps and draft email for:
Patient Name: {visit.patient_name}
Date of Visit: {visit.date_of_visit}
Notes:
{visit.notes}"""

@app.post("/api")
def consultation_summary(
    visit: Visit,
    creds: HTTPAuthorizationCredentials = Depends(clerk_guard),
):
    user_id = creds.decoded["sub"]
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    user_prompt = user_prompt_for(visit)

    prompt = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    # Changement du modèle vers gpt-4o-mini pour la stabilité (le gpt-5-nano n'existe pas encore)
    stream = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=prompt,
        stream=True,
    )

    def event_stream():
        for chunk in stream:
            text = chunk.choices[0].delta.content
            if text:
                # Logique du prof : découpage par ligne pour stabiliser l'affichage SSE
                lines = text.split("\n")
                for line in lines[:-1]:
                    yield f"data: {line}\n\n"
                    # On garde l'astuce du prof pour forcer un petit saut
                    yield "data: \n" 
                yield f"data: {lines[-1]}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")