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

st.set_page_config(page_title="KSBLBot", initial_sidebar_state="collapsed")

ADMIN_KEYS = ['adminmodeenable']

if 'admin_mode' not in st.session_state:
    st.session_state.admin_mode = False

if 'messages' not in st.session_state:
    st.session_state.messages = []

st.title('KSBLBot')

with open('system-prompt.txt', 'r', encoding='utf-8') as f:
    system_prompt = f.read()

models = {
    'openai/gpt-4.1-mini': {
        'api': 'openrouter',
        'display': 'GPT-4.1 Mini'
    },
}

st.session_state['model'] = st.sidebar.selectbox(
    'Choose a model',
    models.keys(),
    format_func=lambda x: models[x]['display'],
    disabled=not st.session_state.admin_mode
)

def get_api_type():
    return models[st.session_state.model]['api']

if get_api_type() == 'openrouter':
    openrouter_client = OpenAI(
        base_url='https://openrouter.ai/api/v1',
        api_key=st.secrets['OPENROUTER_API_KEY'],
    )

# Display history
for message in st.session_state.messages:
    with st.chat_message(message['role']):
        st.markdown(message['content'], help=message.get('tooltip', None))

# Handle new input
if prompt := st.chat_input("Talk to KSBLBot"):
    if prompt in ADMIN_KEYS:
        st.session_state.admin_mode = True
        st.rerun()

    st.session_state.messages.append({'role': 'user', 'content': prompt})
    with st.chat_message('user'):
        st.markdown(prompt)

    tooltip = None

    with st.chat_message('assistant'):
        if get_api_type() == 'openrouter':
            or_messages = [{'role': 'system', 'content': system_prompt}]
            or_messages += [
                {'role': m['role'], 'content': m['content']}
                for m in st.session_state.messages
            ]

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
                st.error(f"Error with OpenRouter API: {e}")
                response_text = "There was an issue with generating a response."
        else:
            response_text = "Model API type not recognized."

    st.session_state.messages.append(
        {'role': 'assistant', 'content': response_text, 'tooltip': tooltip}
    )