from langchain_community.vectorstores import chroma
from langchain_voyageai import VoyageAIEmbeddings
import toml
from prettytable import PrettyTable

from langchain.docstore.document import Document

secrets = toml.load('.streamlit/secrets.toml')

VOYAGE_API_KEY = secrets['VOYAGE_API_KEY']

with open('chunks.txt') as f:
    data = f.read()

chunks = [Document(page_content=i, metadata={
                   'source': 'local'}) for i in data.split('----------')]

voyage_embeddings = VoyageAIEmbeddings(
    voyage_api_key=VOYAGE_API_KEY, model='voyage-large-2'
)

db = chroma.Chroma.from_documents(chunks, voyage_embeddings)

while True:
    query = input()
    docs = db.similarity_search_with_score(query)
    table = PrettyTable()
    table._max_width = {'Field 2': 100}
    print(docs[0])
    for doc, score in docs[:5]:
        # TODO: Hack
        clean_string = doc.page_content.replace('\n', '')
        table.add_row([score, clean_string])
    print(table)
