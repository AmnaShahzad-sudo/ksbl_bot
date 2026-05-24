import os
import shutil
import json
from datetime import datetime
from typing import List, Dict, Any
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

class KnowledgeManager:
    def __init__(self, data_dir: str = "./data", prompts_dir: str = "./prompts", chroma_db_path: str = "./chroma_db", db: Chroma = None):
        self.data_dir = data_dir
        self.prompts_dir = prompts_dir
        
        # Ensure directories exist
        os.makedirs(self.data_dir, exist_ok=True)
        os.makedirs(self.prompts_dir, exist_ok=True)
        
        self.embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
        if db:
            self.db = db
        else:
            self.db = Chroma(
                persist_directory=chroma_db_path, 
                embedding_function=self.embeddings
            )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=100,
            separators=["\n\n", "\n", " ", ""]
        )

    def list_files(self) -> List[Dict[str, Any]]:
        files = []
        if not os.path.exists(self.data_dir):
            return files
            
        for filename in os.listdir(self.data_dir):
            file_path = os.path.join(self.data_dir, filename)
            if os.path.isfile(file_path):
                stats = os.stat(file_path)
                files.append({
                    "filename": filename,
                    "size": stats.st_size,
                    "last_modified": datetime.fromtimestamp(stats.st_mtime).isoformat(),
                    "type": filename.split(".")[-1] if "." in filename else "unknown"
                })
        return files

    def ingest_file(self, filename: str):
        file_path = os.path.join(self.data_dir, filename)
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File {filename} not found in data directory.")

        content = ""
        if filename.lower().endswith(".pdf"):
            try:
                from pypdf import PdfReader
                reader = PdfReader(file_path)
                for page in reader.pages:
                    content += page.extract_text() + "\n"
            except Exception:
                # If PDF reading fails, it might have been edited and saved as plain text
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
        else:
            # Assume text/plain
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

        if not content.strip():
            raise ValueError(f"No text content could be extracted from {filename}")

        # Split into chunks
        chunks = self.text_splitter.split_text(content)
        
        # Create documents with metadata
        documents = [
            Document(
                page_content=chunk, 
                metadata={"source": filename}
            ) for chunk in chunks
        ]

        # First, delete existing vectors for this file to avoid duplicates on update
        self.delete_file_vectors(filename)

        # Add to Chroma
        self.db.add_documents(documents)

    def delete_file_vectors(self, filename: str):
        # LangChain Chroma wrapper doesn't have a direct 'delete by metadata' in all versions
        # but we can use the underlying collection
        self.db.delete(where={"source": filename})

    def delete_file(self, filename: str):
        file_path = os.path.join(self.data_dir, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
        self.delete_file_vectors(filename)

    def rename_file(self, old_name: str, new_name: str):
        old_path = os.path.join(self.data_dir, old_name)
        new_path = os.path.join(self.data_dir, new_name)
        
        if os.path.exists(old_path):
            os.rename(old_path, new_path)
            
            # Update source metadata in Chroma
            # This is tricky in Chroma without re-ingesting or using low-level API
            # For simplicity, we re-ingest
            self.delete_file_vectors(old_name)
            self.ingest_file(new_name)

    def update_file_content(self, filename: str, content: str):
        file_path = os.path.join(self.data_dir, filename)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        self.ingest_file(filename)

    def get_file_content(self, filename: str) -> str:
        file_path = os.path.join(self.data_dir, filename)
        if os.path.exists(file_path):
            if filename.lower().endswith(".pdf"):
                try:
                    from pypdf import PdfReader
                    reader = PdfReader(file_path)
                    content = ""
                    for page in reader.pages:
                        content += page.extract_text() + "\n"
                    return content
                except Exception as e:
                    return f"Error extracting PDF text: {str(e)}"
            else:
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
        return ""
    def list_prompts(self) -> List[Dict[str, Any]]:
        prompts = []
        if not os.path.exists(self.prompts_dir):
            return prompts
            
        for filename in os.listdir(self.prompts_dir):
            file_path = os.path.join(self.prompts_dir, filename)
            if os.path.isfile(file_path):
                stats = os.stat(file_path)
                prompts.append({
                    "filename": filename,
                    "size": stats.st_size,
                    "last_modified": datetime.fromtimestamp(stats.st_mtime).isoformat(),
                })
        return prompts

    def get_prompt_content(self, filename: str) -> str:
        file_path = os.path.join(self.prompts_dir, filename)
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        return ""

    def update_prompt_content(self, filename: str, content: str):
        file_path = os.path.join(self.prompts_dir, filename)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
