
import prompts
from langchain_community.vectorstores import chroma
from langchain_voyageai import VoyageAIEmbeddings
from datetime import datetime, timezone, timedelta
import prettytable
import google.generativeai as genai
import anthropic
import numpy as np
import streamlit as st
import sys
import voyageai
__import__('pysqlite3')
sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')


st.title('KSBLBot')

# TODO: TEMP HACK
with open('system-prompt.txt', 'r') as f:
    system_prompt = f.read()

# TODO: Remove initial load time before diplaying UI if model is Gemini

models = {
    'claude-3-haiku-20240307': {
        'api': 'anthropic',
        'display': 'Claude Haiku'
    },
    'gemini-pro': {
        'api': 'google',
        'display': 'Gemini'
    },
    'claude-3-sonnet-20240229': {
        'api': 'anthropic',
        'display': 'Claude Sonnet'
    },
    'claude-instant-1.2': {
        'api': 'anthropic',
        'display': 'Claude Instant'
    },
}

ADMIN_KEYS = ['adminmodeenable']

if 'admin_mode' not in st.session_state:
    st.session_state.admin_mode = False

st.session_state['model'] = st.sidebar.selectbox(
    'Choose a model',
    models.keys(),
    format_func=lambda x: models[x]['display'],
    on_change=lambda: st.session_state.update({'initialized': False}),
    disabled=not st.session_state.admin_mode
)

st.session_state['rag'] = st.sidebar.checkbox(
    'Retrieval Augmented Generation',
    value=True,
    on_change=lambda: st.session_state.update({'initialized': False}),
    disabled=not st.session_state.admin_mode
)

# TODO: Re-ranking shouldn't be enabled if RAG is not
st.session_state['reranking'] = st.sidebar.checkbox(
    'Reranking',
    value=True,
    disabled=not st.session_state.admin_mode
)

# TODO: Not yet implemented
# st.session_state['parent-document'] = st.sidebar.checkbox(
#     'Parent Document Retriever',
#     value=True,
#     disabled=not st.session_state.admin_mode
# )

# TODO: Change these options and provide proper mapping
st.session_state['detail'] = st.sidebar.select_slider(
    'Level of Detail',
    options=['very short', 'concise', 'detailed'],
    value='concise',
    format_func=lambda x: x.capitalize()
)

st.session_state['email_mode'] = st.sidebar.checkbox(
    'Email Mode',
    value=False,
    on_change=lambda: st.session_state.update({'initialized': False}),
)


def get_api_type():
    return models[st.session_state.model]['api']


if get_api_type() == 'anthropic':
    client = anthropic.Anthropic(api_key=st.secrets['ANTHROPIC_API_KEY'])

elif get_api_type() == 'google':
    genai.configure(api_key=st.secrets['GOOGLE_API_KEY'])
    model = genai.GenerativeModel('gemini-pro')


def initialize_chat():
    # Initialize chat history
    st.session_state.messages = []

    # TODO: Ugly
    if st.session_state.rag:
        if 'rag_db' not in st.session_state:
            # TODO: Does this even persist??
            # Truncation is set because the default 'None' breaks the api
            # TODO: Should probably be set to true
            voyage_embeddings = VoyageAIEmbeddings(
                voyage_api_key=st.secrets['VOYAGE_API_KEY'], model='voyage-large-2', truncation=False
            )
            st.session_state.rag_db = chroma.Chroma(
                persist_directory='./chroma_db', embedding_function=voyage_embeddings)

    if get_api_type() == 'google':
        first_message = {'role': 'user', 'parts': [
            system_prompt + 'Do you understand?']}
        response_text = model.generate_content([first_message]).text
        # st.write(response)

        # TODO: HACK
        st.session_state.messages.append(
            {'role': 'user', 'content': system_prompt, 'display': False})
        st.session_state.messages.append(
            {'role': 'assistant', 'content': response_text, 'display': False})

    st.session_state['initialized'] = True


if not st.session_state.get('initialized', False):
    initialize_chat()

with st.chat_message('assistant'):
    # TODO: Maybe replace with email bot text when toggled here. If there is interest in the mode.
    st.write('Hello! I am KSBLBot. How may I help you today?')

# Display chat messages from history on app rerun
for message in st.session_state.messages:
    # TODO: HACK
    if message.get('display', True):
        with st.chat_message(message['role']):
            # TODO: Tooltip is a hack
            st.markdown(message['content'], help=message.get('tooltip', None))

# React to user input
if prompt := st.chat_input("Talk to KSBLBot"):
    # TODO: A better place for this? Maybe proper auth?
    if prompt in ADMIN_KEYS:
        st.session_state.admin_mode = True
        st.rerun()

    with st.chat_message('user'):
        st.markdown(prompt)
    st.session_state.messages.append({'role': 'user', 'content': prompt})

    # TODO: Tooltip is a hack here
    tooltip = None

    with st.chat_message('assistant'):
        if get_api_type() == 'anthropic':
            if st.session_state.rag:

                user_message = st.session_state.messages[-1]

                model_content = 'The following sections from the policy document contain relevant information. These sections were shared by the creator of the bot and the user can not read them unless you refer to them in your answer:'
                docs = st.session_state.rag_db.similarity_search_with_score(
                    user_message['content'], k=20)

                page_contents = []

                table = prettytable.PrettyTable()
                table.set_style(prettytable.MARKDOWN)
                table.field_names = ['Score', 'Chunk']
                table._max_width = {'Score': 5, 'Chunk': 45}

                # TODO: Hack
                total_chunks = faq_chunks = 0
                for doc, score in docs[:20]:
                    # TODO: Better filters
                    if 'This section is taken from the internal support manual' in doc.page_content:
                        if faq_chunks < 2:
                            faq_chunks += 1
                            total_chunks += 1
                            page_contents.append(doc.page_content)
                            table.add_row(
                                [f"{score:.3f}", doc.page_content.strip()])
                    # TODO: Temp hack
                    elif st.session_state.email_mode and 'The Student Services Department (SSD) is the first point of contact' in doc.page_content:
                        continue
                    else:
                        total_chunks += 1
                        page_contents.append(doc.page_content)
                        table.add_row(
                            [f"{score:.3f}", doc.page_content.strip()])

                    if total_chunks >= 5:
                        break

                tooltip = table.get_string()

                if st.session_state.reranking:
                    # TODO: Do this with LangChain, properly
                    # TODO: Make this client persist
                    voyageai_client = voyageai.Client(
                        st.secrets['VOYAGE_API_KEY'])

                    # TODO: Probably re-rank less than 20
                    docs_to_rerank = [
                        doc.page_content for doc, _ in docs[:20]]

                    rerank_results = voyageai_client.rerank(
                        user_message['content'], docs_to_rerank, 'rerank-lite-1')

                    table.clear_rows()
                    page_contents = []

                    # TODO: Code is copy pasted
                    # TODO: Better filters
                    # TODO: Do we even need FAQ filtering here?
                    # TODO: Hack
                    total_chunks = faq_chunks = 0
                    for result in rerank_results.results:
                        doc, score = result.document, result.relevance_score
                        if 'This section is taken from the internal support manual' in doc:
                            if faq_chunks < 2:
                                faq_chunks += 1
                                total_chunks += 1
                                page_contents.append(doc)
                                table.add_row(
                                    [f"{score:.3f}", doc.strip()])
                        # TODO: Temp hack
                        elif st.session_state.email_mode and 'The Student Services Department (SSD) is the first point of contact' in doc:
                            continue

                        else:
                            total_chunks += 1
                            page_contents.append(doc)
                            table.add_row(
                                [f"{score:.3f}", doc.strip()])

                        if total_chunks >= 5:
                            break

                    # TODO: This After reranking is broken, fix
                    tooltip += ' \n After reranking:'
                    tooltip += table.get_string()

                # Code block mainly for the monospace for table formatting
                # tooltip = '```' + table.get_string() + '```'
                # Formatting as a code block means the next two aren't needed
                # tooltip = tooltip.replace(' ', '&nbsp;')
                # tooltip = tooltip.replace('\n', '  \n  ')
                print(tooltip)

                model_content += '\n----------\n'.join(page_contents)

                model_content += f"\n----------\nThe user's message is as follows: {user_message['content']}"

                # TODO: Hack
                model_content += f"\nPlease provide a {st.session_state.detail} answer. Do not start your answer with 'based on the provided information' or anything similar. Just start with the content of the answer."

                print(model_content)

                user_message['model_content'] = model_content

                if not st.session_state.email_mode:
                    system_prompt = prompts.anthropic_qa_prompt
                else:
                    system_prompt = prompts.anthropic_email_prompt

                system_prompt = system_prompt.format(detail=st.session_state.detail, date_today=(
                    datetime.now(timezone.utc) + timedelta(hours=5)).strftime("%d %B %Y"))

                with client.messages.stream(
                    model=st.session_state.model,
                    max_tokens=1000,
                    temperature=0.0,
                    # TODO: Proper delimiter between user query and policy doc so it knows it is talking to the user
                    # TODO: Proper prompt construction using parameters like detail
                    # TODO: The date statement could probably be shorter
                    system=system_prompt,
                    # TODO: Fix the key in message dict
                    messages=[
                        {'role': m['role'], 'content': m['model_content']}
                        for m in st.session_state.messages
                    ],
                    # stream=True
                ) as stream:
                    response_text = st.write_stream(stream.text_stream)

                print(response_text)

                # TODO: Do we need a separate model_content key anymore?
                user_message['model_content'] = user_message['content']

            else:
                with client.messages.stream(
                    model=st.session_state.model,
                    max_tokens=1000,
                    temperature=0.0,
                    system=system_prompt,
                    messages=[
                        {'role': m['role'], 'content': m['content']}
                        for m in st.session_state.messages
                    ],
                    # stream=True
                ) as stream:
                    response_text = st.write_stream(stream.text_stream)

        if get_api_type() == 'google':
            # TODO: Error handling
            gen_config = genai.types.GenerationConfig(
                temperature=0.0
            )
            # The 'informative answer' makes the model give out much longer responses.
            messages = [{'role': 'model' if m['role'] == 'assistant' else m['role'], 'parts': [
                m['content'] + '\nPlease give a detailed and informative answer.'] if m['role'] == 'user' else m['content']} for m in st.session_state.messages]
            print(messages[2:])
            response = model.generate_content(
                messages, generation_config=gen_config, stream=True)

            st.write_stream((chunk.text for chunk in response))

            print(response.candidates)
            response_text = response.text

    # TODO: Fix this. Probably have diplay_content and model_content
    st.session_state.messages.append(
        {'role': 'assistant', 'content': response_text, 'model_content': response_text, 'tooltip': tooltip})

    # For the tooltip to appear
    st.rerun()
