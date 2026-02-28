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
    Create a professional medical report and a patient email for:
    Patient Name: {visit.patient_name}
    Date of Visit: {visit.date_of_visit}
    Notes: {visit.notes}

    STRUCTURE YOUR RESPONSE WITH THESE EXACT HEADERS:
    ### Summary of visit for the doctor's records
    (Include: Patient Name, Date of Visit, Reason for Visit, and Key Observations)

    ### Next steps for the doctor
    (Provide a numbered list: 1., 2., 3.)

    ### Draft of email to patient in patient-friendly language
    (Include a warm greeting, summary, and sign-off with 'Take care,', '[Doctor's Name]', and '[Doctor's Contact Information]')
    """

    async def event_generator():
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini", 
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a professional medical scribe. You must use clear line breaks. Ensure list items and email signatures (Take care) are on new lines."
                    },
                    {"role": "user", "content": prompt}
                ],
                stream=True
            )

            for chunk in response:
                if chunk.choices[0].delta.content:
                    text = chunk.choices[0].delta.content
                    # Logique du prof : on découpe pour stabiliser le flux
                    lines = text.split("\n")
                    for line in lines[:-1]:
                        yield f"data: {line}\n\n"
                    yield f"data: {lines[-1]}\n\n"
            
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: Error: {str(e)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
    