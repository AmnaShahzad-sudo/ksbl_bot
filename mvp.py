import prompts
from langchain_community.vectorstores import chroma
from langchain_voyageai import VoyageAIEmbeddings
from datetime import datetime, timezone, timedelta
import prettytable
import google.generativeai as genai
import anthropic
from openai import OpenAI
import numpy as np
import streamlit as st
import voyageai

st.set_page_config(page_title="KSBLBot", initial_sidebar_state="auto")

st.sidebar.markdown("""
<style>
    [data-testid="stSidebarNav"] {display: none;}
</style>
""", unsafe_allow_html=True)
st.sidebar.page_link("mvp.py", label="User", icon="💬")
st.sidebar.page_link("pages/admin.py", label="Admin", icon="⚙️")

ADMIN_KEYS = ['adminmodeenable']

if 'admin_mode' not in st.session_state:
    st.session_state.admin_mode = False

if 'messages' not in st.session_state:
    st.session_state.messages = []

st.title('KSBLBot')

# Remove circular mask for avatar so the full logo can be displayed large
st.markdown("""
<style>
    [data-testid="stChatMessageAvatar"] {
        border-radius: 0 !important;
        background-color: transparent !important;
    }
    [data-testid="stChatMessageAvatar"] img {
        border-radius: 0 !important;
    }
</style>
""", unsafe_allow_html=True)

with open('system-prompt.txt', 'r', encoding='utf-8') as f:
    system_prompt = f.read()

models = {
    'openai/gpt-4.1-mini': {
        'api': 'openrouter',
        'display': 'GPT-4.1 Mini'
    },
}

# Hardcoded settings - no sidebar
st.session_state['model'] = 'openai/gpt-4.1-mini'
st.session_state['rag'] = True
st.session_state['reranking'] = True
st.session_state['detail'] = 'concise'
st.session_state['email_mode'] = False


def get_api_type():
    return models[st.session_state.model]['api']


if get_api_type() == 'openrouter':
    openrouter_client = OpenAI(
        base_url='https://openrouter.ai/api/v1',
        api_key=st.secrets['OPENROUTER_API_KEY'],
    )

if st.session_state.rag and 'rag_db' not in st.session_state:
    voyage_embeddings = VoyageAIEmbeddings(
        voyage_api_key=st.secrets['VOYAGE_API_KEY'], model='voyage-large-2', truncation=False
    )
    st.session_state.rag_db = chroma.Chroma(
        persist_directory='./chroma_db', embedding_function=voyage_embeddings)

# Display chat history
for message in st.session_state.messages:
    avatar = "Assets/KSBL_Logo_square.png" if message['role'] == 'assistant' else None
    with st.chat_message(message['role'], avatar=avatar):
        st.markdown(message['content'], help=message.get('tooltip', None))

# Handle new input
if prompt := st.chat_input("Talk to KSBLBot"):
    if prompt in ADMIN_KEYS:
        st.session_state.admin_mode = True
        st.rerun()

    # --- Vulgarity Control ---
    vulgar_words = [
        "fuck", "shit", "bitch", "asshole", "cunt", "bastard", "motherfucker", 
        "dick", "pussy", "slut", "whore", "faggot", "nigger", "crap", "bullshit"
    ]
    prompt_lower = prompt.lower()
    is_vulgar = any(word in prompt_lower for word in vulgar_words)
    # -------------------------

    with st.chat_message('user'):
        st.markdown(prompt)
    st.session_state.messages.append({'role': 'user', 'content': prompt})

    tooltip = None

    with st.chat_message('assistant', avatar="Assets/KSBL_Logo_square.png"):

        if is_vulgar:
            response_text = "I kindly request you to maintain respectful and polite language. As representatives of KSBL, we uphold the values of courtesy and Islamic etiquette in all our interactions. JazakAllah Khair."
            st.markdown(response_text)
            st.session_state.messages.append({
                'role': 'assistant',
                'content': response_text,
                'model_content': response_text,
                'tooltip': None
            })
            st.stop()

        if not st.session_state.email_mode:
            active_system_prompt = prompts.anthropic_qa_prompt
        else:
            active_system_prompt = prompts.anthropic_email_prompt

        active_system_prompt = active_system_prompt.format(
            detail=st.session_state.detail,
            date_today=(datetime.now(timezone.utc) + timedelta(hours=5)).strftime("%d %B %Y")
        )

        if st.session_state.rag:
            user_content = st.session_state.messages[-1]['content']

            model_content = 'The following sections from the policy document contain relevant information. These sections were shared by the creator of the bot and the user can not read them unless you refer to them in your answer:'
            docs = st.session_state.rag_db.similarity_search_with_score(user_content, k=20)

            page_contents = []
            table = prettytable.PrettyTable()
            table.set_style(prettytable.MARKDOWN)
            table.field_names = ['Score', 'Chunk']
            table._max_width = {'Score': 5, 'Chunk': 45}

            total_chunks = faq_chunks = 0
            for doc, score in docs[:20]:
                if 'This section is taken from the internal support manual' in doc.page_content:
                    if faq_chunks < 2:
                        faq_chunks += 1
                        total_chunks += 1
                        page_contents.append(doc.page_content)
                        table.add_row([f"{score:.3f}", doc.page_content.strip()])
                elif st.session_state.email_mode and 'The Student Services Department (SSD) is the first point of contact' in doc.page_content:
                    continue
                else:
                    total_chunks += 1
                    page_contents.append(doc.page_content)
                    table.add_row([f"{score:.3f}", doc.page_content.strip()])

                if total_chunks >= 5:
                    break

            tooltip = table.get_string()

            if st.session_state.reranking:
                voyageai_client = voyageai.Client(st.secrets['VOYAGE_API_KEY'])
                docs_to_rerank = [doc.page_content for doc, _ in docs[:20] if doc.page_content.strip()]
                
                if docs_to_rerank:
                    rerank_results = voyageai_client.rerank(user_content, docs_to_rerank, 'rerank-lite-1')

                    table.clear_rows()
                    page_contents = []
                    total_chunks = faq_chunks = 0

                    for result in rerank_results.results:
                        doc, score = result.document, result.relevance_score
                        if 'This section is taken from the internal support manual' in doc:
                            if faq_chunks < 2:
                                faq_chunks += 1
                                total_chunks += 1
                                page_contents.append(doc)
                                table.add_row([f"{score:.3f}", doc.strip()])
                        elif st.session_state.email_mode and 'The Student Services Department (SSD) is the first point of contact' in doc:
                            continue
                        else:
                            total_chunks += 1
                            page_contents.append(doc)
                            table.add_row([f"{score:.3f}", doc.strip()])

                        if total_chunks >= 5:
                            break

                    tooltip += '\nAfter reranking:\n' + table.get_string()

            model_content += '\n----------\n'.join(page_contents)
            model_content += f"\n----------\nThe user's message is as follows: {user_content}"
            model_content += f"\nPlease provide a {st.session_state.detail} answer. Do not start your answer with 'based on the provided information' or anything similar."
        else:
            model_content = prompt

        history = st.session_state.messages[:-1]
        api_messages = [{'role': m['role'], 'content': m.get('model_content', m['content'])} for m in history]
        api_messages.append({'role': 'user', 'content': model_content})

        if get_api_type() == 'openrouter':
            or_messages = [{'role': 'system', 'content': active_system_prompt}] + api_messages
            try:
                stream = openrouter_client.chat.completions.create(
                    model=st.session_state.model,
                    max_tokens=1000,
                    temperature=0.0,
                    messages=or_messages,
                    stream=True,
                )
                response_text = st.write_stream(
                    chunk.choices[0].delta.content or ''
                    for chunk in stream
                    if chunk.choices[0].delta.content
                )
            except Exception as e:
                st.error(f"Error: {e}")
                response_text = "There was an issue generating a response."

    st.session_state.messages.append({
        'role': 'assistant',
        'content': response_text,
        'model_content': response_text,
        'tooltip': tooltip
    })