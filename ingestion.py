from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_community.vectorstores import chroma
import toml

from langchain_core.documents import Document

secrets = toml.load('.streamlit/secrets.toml')
VOYAGE_API_KEY = secrets['VOYAGE_API_KEY']

with open('chunks.txt', encoding='utf-8') as f:
    data = f.read()

chunks = [Document(page_content=i, metadata={
                   'source': 'local'}) for i in data.split('----------')]

# Use Local FastEmbed (Free forever, zero limits, very stable)
fe_embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")

db = chroma.Chroma.from_documents(
    chunks, fe_embeddings, persist_directory='./chroma_db')
