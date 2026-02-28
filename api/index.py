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
    # Prompt conçu pour reproduire exactement la structure des images
    prompt = f"""
    You are an expert medical assistant. Based on the notes below, generate a professional consultation report.
    
    PATIENT: {visit.patient_name}
    DATE: {visit.date_of_visit}
    NOTES: {visit.notes}

    INSTRUCTIONS:
    - Use clear, bold headers for each section.
    - Provide professional clinical insights for the doctor sections.
    - Provide a warm, patient-friendly tone for the email section.

    STRUCTURE TO FOLLOW EXACTLY:

    Summary of visit for the doctor's records
    
    Patient Name: {visit.patient_name}
    Date of Visit: {visit.date_of_visit}
    Reason for Visit: [Extract or infer the reason for the visit]
    Key Observations: [Summary of symptoms, vitals, or status provided in notes]

    Next steps for the doctor
    
    1. [Specific clinical action 1]
    2. [Specific clinical action 2]
    3. [Follow-up or further testing suggestion]

    Draft of email to patient in patient-friendly language
    
    Dear {visit.patient_name},
    [Write 2 professional and supportive paragraphs summarizing the visit and reinforcing care instructions.]
    
    Take care,
    
    [Doctor's Name]
    [Doctor's Contact Information]
    """

    async def event_generator():
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini", 
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a professional medical scribe. You provide structured reports with headers: Summary, Next steps, and Draft of email. Use double line breaks (\\n\\n) for clarity."
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