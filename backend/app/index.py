from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.rag import generate_feedback
from openai import OpenAI
from dotenv import load_dotenv
import os
import tempfile

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextFeedbackRequest(BaseModel):
    job_description: str
    question: str
    answer: str


@app.get("/")
def root():
    return {"status": "ok"}


@app.post("/feedback")
async def feedback(
    audio: UploadFile = File(...),
    job_description: str = Form(...),
    question: str = Form(...)
):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            temp_file.write(await audio.read())
            temp_path = temp_file.name

        with open(temp_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )

        transcript = transcription.text

        result = generate_feedback(
            job_description=job_description,
            question=question,
            answer=transcript
        )

        os.remove(temp_path)

        return {
            "transcript": transcript,
            "feedback": result
        }

    except Exception as e:
        return {"error": str(e)}


@app.post("/feedback-text")
async def feedback_text(req: TextFeedbackRequest):
    try:
        result = generate_feedback(
            job_description=req.job_description,
            question=req.question,
            answer=req.answer
        )

        return {
            "feedback": result
        }

    except Exception as e:
        return {"error": str(e)}