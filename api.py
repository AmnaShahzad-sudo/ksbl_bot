import os
import time
import shutil
from typing import List, Dict, Optional
from pydantic import BaseModel
from fastapi import FastAPI, Header, HTTPException, Depends, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


from rag_engine import KSBLBotEngine
from knowledge_manager import KnowledgeManager

# Initialize FastAPI and Rate Limiter
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="KSBL Bot API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration - Update with your WordPress domain
# api.py around line 24
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ksbl-admin-dashboard.vercel.app", # Production frontend
        "http://localhost:3000",                  # Local dev port 3000
        "http://localhost:3001",                  # Local dev port 3001
        "http://localhost:8000",                  # Swagger/Local API port 8000
        "http://127.0.0.1:8000",                  # Swagger/Local API port 8000 (IP)
        "http://localhost:8010",                  # Docker API port 8010
        "http://127.0.0.1:8010",                  # Docker API port 8010 (IP)
        "https://dev.ksbl.pk",
        "https://www.ksbl.edu.pk"                 # Base domain (no trailing slash)
    ],
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
    groq_api_key=get_secret("GROQ_API_KEY", "dummy_key"),
    base_url=get_secret("LLM_BASE_URL"),
    model_name=get_secret("LLM_MODEL", "qwen/qwen3-32b")
)

km = KnowledgeManager(db=engine.db)

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
    # Validate request
    if not chat_request.messages or not chat_request.messages[-1].content.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty")
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

# --- Admin Endpoints ---

@app.get("/v1/admin/files")
async def list_files(api_key: str = Depends(verify_api_key)):
    return km.list_files()

@app.post("/v1/admin/upload")
async def upload_file(
    file: UploadFile = File(...), 
    api_key: str = Depends(verify_api_key)
):
    # Save file to data directory
    file_path = os.path.join(km.data_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Ingest into Chroma
    try:
        km.ingest_file(file.filename)
        return {"message": f"File {file.filename} uploaded and ingested successfully."}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

@app.delete("/v1/admin/files/{filename}")
async def delete_file(
    filename: str, 
    api_key: str = Depends(verify_api_key)
):
    try:
        km.delete_file(filename)
        return {"message": f"File {filename} deleted successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/v1/admin/files/{filename}/content")
async def get_file_content(
    filename: str, 
    api_key: str = Depends(verify_api_key)
):
    content = km.get_file_content(filename)
    if not content and filename not in [f['filename'] for f in km.list_files()]:
        raise HTTPException(status_code=404, detail="File not found")
    return {"filename": filename, "content": content}

@app.put("/v1/admin/files/{filename}/content")
async def update_file_content(
    filename: str, 
    data: Dict[str, str], 
    api_key: str = Depends(verify_api_key)
):
    content = data.get("content")
    if content is None:
        raise HTTPException(status_code=400, detail="Content is required")
    try:
        km.update_file_content(filename, content)
        return {"message": f"File {filename} updated and re-ingested successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Prompt Endpoints ---

@app.get("/v1/admin/prompts")
async def list_prompts(api_key: str = Depends(verify_api_key)):
    return km.list_prompts()

@app.get("/v1/admin/prompts/{filename}/content")
async def get_prompt_content(
    filename: str, 
    api_key: str = Depends(verify_api_key)
):
    content = km.get_prompt_content(filename)
    if not content and filename not in [p['filename'] for p in km.list_prompts()]:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return {"filename": filename, "content": content}

@app.put("/v1/admin/prompts/{filename}/content")
async def update_prompt_content(
    filename: str, 
    data: Dict[str, str], 
    api_key: str = Depends(verify_api_key)
):
    content = data.get("content")
    if content is None:
        raise HTTPException(status_code=400, detail="Content is required")
    try:
        km.update_prompt_content(filename, content)
        # If it's the main system prompt, update the live engine
        if filename == "system_prompt.txt":
            engine.base_system_prompt = content
        return {"message": f"Prompt {filename} updated successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
