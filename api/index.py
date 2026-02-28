from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
# ... tes autres imports (openai, clerk, etc.)

app = FastAPI()

# Définition de l'objet Visit pour Pydantic (Step 2 du doc)
class Visit(BaseModel):
    patient_name: str
    date_of_visit: str
    notes: str

@app.post("/api") # <--- DOIT ÊTRE @app.post
async def generate_summary(visit: Visit, request: Request):
    # Ton code pour appeler OpenAI ici...
    # Utilise visit.patient_name, visit.notes, etc.
    pass

# Optionnel : pour tester si l'API répond
@app.get("/api/hello")
async def hello():
    return {"message": "Hello from FastAPI"}