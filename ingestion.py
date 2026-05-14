import os
import shutil
from langchain_chroma import Chroma
from langchain_community.embeddings import OllamaEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

# 1. Remove the old Chroma DB if it exists so we don't get dimension errors
if os.path.exists('./chroma_db'):
    shutil.rmtree('./chroma_db')
    print("Deleted old chroma_db directory.")

# 2. Read the pre-processed chunks file
with open('chunks.txt', encoding='utf-8') as f:
    data = f.read()

# Since the file was previously hard-split by '----------', let's join it back to raw text 
# (or just keep it as is, but we want the text splitter to handle overlap)
raw_text = data.replace('----------', '\n\n')

# 3. Create the text splitter with overlapping
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
    is_separator_regex=False,
)

# 4. Split the text into overlapping chunks
chunks = text_splitter.create_documents([raw_text], metadatas=[{'source': 'local'}])
print(f"Created {len(chunks)} overlapping chunks.")

# 5. Initialize local Ollama embeddings
ollama_embeddings = OllamaEmbeddings(
    model='nomic-embed-text', 
    base_url='http://localhost:11434'
)

# 6. Build and save the new Chroma DB
print("Building the new Chroma database...")
db = Chroma.from_documents(
    chunks, 
    ollama_embeddings, 
    persist_directory='./chroma_db'
)
print("Finished! The vector store is ready.")
