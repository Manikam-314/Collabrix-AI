import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_google_genai import GoogleGenerativeAIEmbeddings

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

def get_llm():
    return ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        temperature=0.0,
        google_api_key=GEMINI_API_KEY
    )

def get_embeddings():
    return GoogleGenerativeAIEmbeddings(
        model="models/embedding-001",
        google_api_key=GEMINI_API_KEY
    )
