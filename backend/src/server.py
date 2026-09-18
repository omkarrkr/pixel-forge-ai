import os

from dotenv import load_dotenv
from fastapi import FastAPI
from google import genai

load_dotenv()

app = FastAPI()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY is not set in the .env file")

client = genai.Client(api_key=api_key)


@app.get("/")
def home():
    return {
        "message": "PixelForge AI backend is running 🚀"
    }


@app.get("/test-gemini")
def test_gemini():
    interaction = client.interactions.create(
        model="gemini-3.8-flash",
        input="Say hello to PixelForge AI in one short sentence."
    )

    return {
        "response": interaction.output_text
    }