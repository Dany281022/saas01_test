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
    # Prompt conçu pour générer les 3 sections visibles sur tes images
    prompt = f"""
    You are an expert medical assistant. Based on the notes below, generate a professional consultation report.
    
    PATIENT: {visit.patient_name}
    DATE: {visit.date_of_visit}
    NOTES: {visit.notes}

    STRUCTURE YOUR RESPONSE EXACTLY AS FOLLOWS:

    Summary of visit for the doctor's records
    
    Patient Name: {visit.patient_name}
    Date of Visit: {visit.date_of_visit}
    Reason for Visit: [Extract the main reason]
    Key Observations: [Summary of symptoms or status]

    Next steps for the doctor
    
    1. [Clinical action item 1]
    2. [Clinical action item 2]
    3. [Follow-up suggestion]

    Draft of email to patient in patient-friendly language
    
    Dear {visit.patient_name},
    [Write a warm, professional 2-paragraph email summarizing the visit, next steps, and encouragement.]
    
    Take care,
    [Doctor's Name]
    """

    async def event_generator():
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini", 
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a professional medical scribe. You always provide a 3-section report: Summary, Next Steps, and Patient Email. Use clear spacing and bold headers."
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
    