import os
import time
from typing import List, Dict, Optional
from pydantic import BaseModel
from fastapi import FastAPI, Header, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

from rag_engine import KSBLBotEngine

# Load environment variables
load_dotenv()

# Initialize FastAPI and Rate Limiter
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="KSBL Bot API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration - Update with your WordPress domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, replace with your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Key Security
API_KEY_NAME = "X-API-KEY"
# For development, you can set this in .env. If not set, it defaults to a secure string.
SERVER_API_KEY = os.getenv("KSBL_API_KEY", "ksbl_secure_token_2024")

async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != SERVER_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return x_api_key

# Initialize Engine
# Try to get keys from env, or fall back to streamlit secrets if available
def get_secret(key, default=None):
    # Try environment variables first
    val = os.getenv(key)
    if val:
        return val
    # Fallback to streamlit secrets if running in an environment that has them
    try:
        import streamlit as st
        return st.secrets.get(key, default)
    except:
        return default

engine = KSBLBotEngine(
    groq_api_key=get_secret("GROQ_API_KEY"),
    voyage_api_key=get_secret("VOYAGE_API_KEY")
)

class ChatMessage(BaseModel):
    role: str
    content: str
    model_content: Optional[str] = None

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    detail: Optional[str] = "concise"
    email_mode: Optional[bool] = False

@app.post("/v1/chat")
@limiter.limit("20/minute")
async def chat(
    request: Request,
    chat_request: ChatRequest, 
    api_key: str = Depends(verify_api_key)
):
    # Convert Pydantic models to dictionaries
    msgs = [m.model_dump() for m in chat_request.messages]
    
    def generate():
        for chunk in engine.chat_stream(
            messages=msgs, 
            detail=chat_request.detail, 
            email_mode=chat_request.email_mode
        ):
            yield chunk

    return StreamingResponse(generate(), media_type="text/plain")

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": time.time()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
