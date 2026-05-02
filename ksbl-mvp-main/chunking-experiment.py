from langchain_experimental.text_splitter import SemanticChunker
from langchain_voyageai import VoyageAIEmbeddings

import toml

secrets = toml.load('.streamlit/secrets.toml')
VOYAGE_API_KEY = secrets['VOYAGE_API_KEY']

voyage_embeddings = VoyageAIEmbeddings(
    voyage_api_key=VOYAGE_API_KEY, model='voyage-large-2'
)

text_splitter = SemanticChunker(voyage_embeddings)

with open('system-prompt.txt') as f:
    data = f.read()

docs = text_splitter.create_documents([data])

for i in docs:
    print(i.page_content)
    print('------')
