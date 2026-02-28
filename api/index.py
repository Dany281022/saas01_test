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
You are a professional medical scribe.

Generate ONLY valid HTML with these EXACT sections using <h3>, <p>, <ol>, <li> tags.

<h3>Summary of visit for the doctor's records</h3>
<p><strong>Patient Name:</strong> {visit.patient_name}</p>
<p><strong>Date of Visit:</strong> {visit.date_of_visit}</p>
<p><strong>Reason for Visit:</strong> [Briefly state the reason]</p>
<p><strong>Key Observations:</strong> [Summary of clinical findings]</p>

<h3>Next steps for the doctor</h3>
<ol>
<li>[Action 1]</li>
<li>[Action 2]</li>
<li>[Action 3]</li>
</ol>

<h3>Draft of email to patient in patient-friendly language</h3>
<p>Dear {visit.patient_name},</p>
<p>[Paragraph 1: Summary of visit]</p>
<p>[Paragraph 2: Care instructions]</p>
<p>Take care,<br/>Doctor</p>

NOTES FROM DOCTOR:
{visit.notes}

IMPORTANT:
- Output ONLY HTML.
- Do NOT use ### or Markdown.
- Do NOT add explanations.
"""

    async def event_generator():
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You output clean medical HTML only."},
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