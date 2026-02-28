import os
import json
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI

app = FastAPI()

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

class Visit(BaseModel):
    patient_name: str
    date_of_visit: str
    notes: str

@app.post("/api")
async def generate_summary(visit: Visit, request: Request):
    # Changement de stratégie : On demande des doubles sauts de ligne TRÈS explicites
    prompt = f"""
    You are a professional medical assistant. Summarize these notes in English.
    Patient: {visit.patient_name}
    Date: {visit.date_of_visit}
    Notes: {visit.notes}
    
    OUTPUT FORMAT RULES:
    1. Start with the title: "Summary of visit for the doctor's records"
    2. Then, leave a blank line.
    3. Each following line MUST start with a bullet point '*' and end with TWO new line characters.
    
    EXACT EXAMPLE STRUCTURE:
    Summary of visit for the doctor's records
    
    * Patient: {visit.patient_name}
    
    * Date of Visit: {visit.date_of_visit}
    
    * Diagnosis: [Insert]
    """

    async def event_generator():
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini", 
                messages=[
                    {"role": "system", "content": "You are a medical scribe. You always separate bullet points with two new lines (\\n\\n) to ensure they display correctly in Markdown."},
                    {"role": "user", "content": prompt}
                ],
                stream=True
            )

            for chunk in response:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    # On s'assure que les \n ne sont pas perdus lors de l'encodage SSE
                    yield f"data: {content}\n\n"
            
            yield "data: [DONE]\n\n"

        except Exception as e:
            yield f"data: Erreur technique : {str(e)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
    