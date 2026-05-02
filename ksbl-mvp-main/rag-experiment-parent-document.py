from langchain_community.vectorstores import chroma
from langchain_voyageai import VoyageAIEmbeddings
import toml
from prettytable import PrettyTable

from langchain.docstore.document import Document
from langchain.retrievers import ParentDocumentRetriever

from langchain.storage import InMemoryStore
from langchain_text_splitters import RecursiveCharacterTextSplitter

secrets = toml.load('.streamlit/secrets.toml')

VOYAGE_API_KEY = secrets['VOYAGE_API_KEY']

with open('chunks.txt') as f:
    data = f.read()

parent_chunks = [Document(page_content=i, metadata={
    'source': 'local'}) for i in data.split('----------')]

voyage_embeddings = VoyageAIEmbeddings(
    voyage_api_key=VOYAGE_API_KEY, model='voyage-large-2'
)

vectorstore = chroma.Chroma(
    collection_name='split_parents', embedding_function=voyage_embeddings)
store = InMemoryStore()
child_splitter = RecursiveCharacterTextSplitter(
    chunk_size=100, chunk_overlap=25)

retriever = ParentDocumentRetriever(
    vectorstore=vectorstore,
    docstore=store,
    child_splitter=child_splitter
)

retriever.add_documents(parent_chunks)


# db = chroma.Chroma.from_documents(chunks, voyage_embeddings)

while True:
    query = input()
    docs = vectorstore.similarity_search_with_score(query)
    docs2 = retriever.get_relevant_documents(query)
    print(docs2)
    # docs = db.similarity_search_with_score(query)
    table = PrettyTable()
    table._max_width = {'Field 2': 100}
    print(docs[0])
    for doc, score in docs[:5]:
        # TODO: Hack
        clean_string = doc.page_content.replace('\n', '')
        table.add_row([score, clean_string])
    print(table)
