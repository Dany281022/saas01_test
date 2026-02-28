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
    prompt = f"""
    You are a professional medical scribe. Generate a report with these EXACT sections:

    ### Summary of visit for the doctor's records
    Patient Name: {visit.patient_name}
    Date of Visit: {visit.date_of_visit}
    Reason for Visit: [Briefly state the reason]
    Key Observations: [Summary of clinical findings]

    ### Next steps for the doctor
    1. [Action 1]
    2. [Action 2]
    3..[Action 3]

    ### Draft of email to patient in patient-friendly language
    Dear {visit.patient_name},
    [Paragraph 1: Summary of visit]

    [Paragraph 2: Care instructions]

    Take care,
    [Doctor's Name]
    [Doctor's Contact Information]

    NOTES: {visit.notes}
    
    IMPORTANT: No extra empty lines between Patient Name and Key Observations.
    """

    async def event_generator():
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini", 
                messages=[
                    {"role": "system", "content": "You provide medical summaries. Use double newlines only between sections and paragraphs in the email."},
                    {"role": "user", "content": prompt}
                ],
                stream=True
            )
            for chunk in response:
                if chunk.choices[0].delta.content:
                    yield f"data: {chunk.choices[0].delta.content}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: Error: {str(e)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")