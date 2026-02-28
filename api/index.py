import os
import json
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI

app = FastAPI()

# Initialisation du client OpenAI
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

class Visit(BaseModel):
    patient_name: str
    date_of_visit: str
    notes: str

@app.post("/api")
async def generate_summary(visit: Visit, request: Request):
    # Prompt ajusté pour correspondre EXACTEMENT à ton image (Anglais + Listes à puces)
    prompt = f"""
    You are an expert medical assistant. Analyze the following notes and provide a summary in English.
    
    PATIENT NAME: {visit.patient_name}
    DATE OF VISIT: {visit.date_of_visit}
    CLINICAL NOTES: {visit.notes}
    
    Format the output EXACTLY like this (using bullet points):
    
    Summary of visit for the doctor's records
    * Patient: [Patient Name]
    * Date of Visit: [Date]
    * Diagnosis: [Brief diagnosis based on notes]
    * Initial management plan: [Key actions or treatments]
    * Antiviral consideration: [Specific advice if applicable, or state if not needed]
    """

    async def event_generator():
        try:
            # Appel en streaming à OpenAI
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a professional medical assistant who summarizes notes in English."},
                    {"role": "user", "content": prompt}
                ],
                stream=True
            )

            for chunk in response:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    # Format Standard SSE
                    yield f"data: {content}\n\n"
            
            yield "data: [DONE]\n\n"

        except Exception as e:
            yield f"data: Erreur technique : {str(e)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# Route de test
@app.get("/api/hello")
async def hello():
    return {
        "status": "Le backend Python fonctionne !", 
        "key_detected": "OPENAI_API_KEY" in os.environ
    }
    