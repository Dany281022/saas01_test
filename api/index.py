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
    # Prompt optimisé pour l'espacement et les titres en gras
    prompt = f"""
    Create a professional medical report. Use the exact headings below.
    
    ### Summary of visit for the doctor's records
    Patient Name: {visit.patient_name}
    Date of Visit: {visit.date_of_visit}
    Reason for Visit: [Extract reason]
    Key Observations: [Extract observations]

    ### Next steps for the doctor
    1. [Action 1]
    2. [Action 2]

    ### Draft of email to patient in patient-friendly language
    Dear {visit.patient_name},
    [Paragraph 1]

    [Paragraph 2]

    Take care,
    [Doctor's Name]
    [Doctor's Contact Information]

    NOTES TO PROCESS:
    {visit.notes}
    """

    async def event_generator():
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini", 
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a medical scribe. Return ONLY the requested sections. Use double newlines (\\n\\n) between sections and paragraphs. Do not use bold (**) for the main ### headings."
                    },
                    {"role": "user", "content": prompt}
                ],
                stream=True
            )

            for chunk in response:
                if chunk.choices[0].delta.content:
                    text = chunk.choices[0].delta.content
                    # Logique du prof : split par ligne pour préserver les sauts de ligne
                    lines = text.split("\n")
                    for line in lines[:-1]:
                        yield f"data: {line}\n\n"
                    yield f"data: {lines[-1]}\n\n"
            
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: Error: {str(e)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
    