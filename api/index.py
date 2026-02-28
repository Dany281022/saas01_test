import os
import json
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI

app = FastAPI()

# Initialisation du client OpenAI avec le nom EXACT de la variable Vercel
# Assure-toi que dans Vercel > Settings, le nom est bien OPENAI_API_KEY
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# Modèle de données pour valider le JSON envoyé par le frontend (Day 05)
class Visit(BaseModel):
    patient_name: str
    date_of_visit: str
    notes: str

@app.post("/api")
async def generate_summary(visit: Visit, request: Request):
    # Construction du prompt professionnel
    prompt = f"""
    Tu es un assistant médical expert. Analyse les notes suivantes :
    NOM DU PATIENT : {visit.patient_name}
    DATE DE LA VISITE : {visit.date_of_visit}
    NOTES CLINIQUES : {visit.notes}
    
    Génère un compte-rendu structuré en Markdown avec :
    1. Un résumé professionnel de la consultation.
    2. Une liste d'actions à entreprendre (ordonnances, examens).
    3. Un projet d'email bienveillant pour le patient.
    """

    async def event_generator():
        try:
            # Appel en streaming à OpenAI
            response = client.chat.completions.create(
                model="gpt-4o",  # Utilise un modèle valide (gpt-4o ou gpt-3.5-turbo)
                messages=[{"role": "system", "content": "Tu es un assistant médical."},
                          {"role": "user", "content": prompt}],
                stream=True
            )

            for chunk in response:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    # Format Standard SSE (Server-Sent Events)
                    # On envoie "data: " + le texte + deux sauts de ligne
                    yield f"data: {content}\n\n"
            
            # Optionnel : signal de fin
            yield "data: [DONE]\n\n"

        except Exception as e:
            # En cas d'erreur (ex: clé API invalide ou solde épuisé)
            yield f"data: Erreur technique : {str(e)}\n\n"

    # On renvoie une réponse de type flux (Streaming)
    return StreamingResponse(event_generator(), media_type="text/event-stream")

# Route de test pour vérifier que le backend tourne
@app.get("/api/hello")
async def hello():
    return {"status": "Le backend Python fonctionne !", "key_detected": "OPENAI_API_KEY" in os.environ}
    