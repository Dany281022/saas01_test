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
    # Prompt optimisé pour gpt-4o-mini avec instructions de saut de ligne
    prompt = f"""
    You are an expert medical assistant. Analyze the following notes and provide a summary in English.
    
    PATIENT NAME: {visit.patient_name}
    DATE OF VISIT: {visit.date_of_visit}
    CLINICAL NOTES: {visit.notes}
    
    IMPORTANT: Provide the output with clear line breaks so it is easy to read.
    Format the output EXACTLY like this:
    
    Summary of visit for the doctor's records
    
    * Patient: {visit.patient_name}
    * Date of Visit: {visit.date_of_visit}
    * Diagnosis: [Brief diagnosis]
    * Initial management plan: [Key actions]
    * Antiviral consideration: [Advice or N/A]
    """

    async def event_generator():
        try:
            # Utilisation de gpt-4o-mini
            response = client.chat.completions.create(
                model="gpt-4o-mini", 
                messages=[
                    {"role": "system", "content": "You are a professional medical assistant. Use bullet points and clear spacing."},
                    {"role": "user", "content": prompt}
                ],
                stream=True
            )

            for chunk in response:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    # On envoie le contenu tel quel, le frontend doit gérer le style
                    yield f"data: {content}\n\n"
            
            yield "data: [DONE]\n\n"

        except Exception as e:
            yield f"data: Erreur technique : {str(e)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/hello")
async def hello():
    return {"status": "GPT-4o-mini is ready", "key_detected": "OPENAI_API_KEY" in os.environ}
    