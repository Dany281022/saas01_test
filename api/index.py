import os
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
    # Prompt "verrouillé" : l'IA ne peut pas inventer de nouveaux titres
    prompt = f"""
    You are a strict medical scribe. Summarize the clinical notes using ONLY these 5 categories. 
    If information is missing for a category, write "Not specified based on current notes".

    PATIENT: {visit.patient_name}
    DATE: {visit.date_of_visit}
    NOTES: {visit.notes}

    STRICT FORMAT TO FOLLOW:
    Summary of visit for the doctor's records
    
    * Patient: {visit.patient_name}
    
    * Date of Visit: {visit.date_of_visit}
    
    * Diagnosis/Assessment: [Brief diagnosis or risk assessment]
    
    * Initial management plan: [Key actions or treatments]
    
    * Antiviral consideration: [Specific advice or N/A]
    """

    async def event_generator():
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini", 
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a professional medical assistant. You MUST follow the requested 5-bullet structure exactly. Never add extra sections like 'Next steps' or 'Notes reviewed'. Use double line breaks (\\n\\n)."
                    },
                    {"role": "user", "content": prompt}
                ],
                stream=True
            )

            for chunk in response:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    yield f"data: {content}\n\n"
            
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: Error: {str(e)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")