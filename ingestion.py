from langchain_chroma import Chroma
from langchain_voyageai import VoyageAIEmbeddings
import toml

from langchain_core.documents import Document

secrets = toml.load('.streamlit/secrets.toml')
VOYAGE_API_KEY = secrets['VOYAGE_API_KEY']

with open('chunks.txt') as f:
    data = f.read()

chunks = [Document(page_content=i, metadata={
                   'source': 'local'}) for i in data.split('----------')]

# Truncation is set because the default 'None' breaks the api
voyage_embeddings = VoyageAIEmbeddings(
    voyage_api_key=VOYAGE_API_KEY, model='voyage-large-2', truncation=False
)

db = Chroma.from_documents(
    chunks, voyage_embeddings, persist_directory='./chroma_db')
