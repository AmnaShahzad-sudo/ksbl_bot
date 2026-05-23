import os
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Generator
import prettytable
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_community.vectorstores import chroma
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
import prompts

class KSBLBotEngine:
    def __init__(self, groq_api_key: str = None, chroma_db_path: str = "./chroma_db", base_url: str = None, model_name: str = "gemma3:1b"):
        self.llm = ChatOllama(
            model=model_name,
            temperature=0.3,
            base_url=base_url
        )
        self.model_name = model_name
        
        # FastEmbed is a lightweight, high-performance local embedding model
        self.embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
        
        self.db = chroma.Chroma(
            persist_directory=chroma_db_path, 
            embedding_function=self.embeddings
        )
        
        try:
            with open('prompts/system_prompt.txt', 'r', encoding='utf-8') as f:
                self.base_system_prompt = f.read()
        except FileNotFoundError:
            self.base_system_prompt = "You are KSBLBot, an assistant for KSBL."

    def check_vulgarity(self, text: str) -> bool:
        vulgar_words = [
            "fuck", "shit", "bitch", "asshole", "cunt", "bastard", "motherfucker", 
            "dick", "pussy", "slut", "whore", "faggot", "nigger", "crap", "bullshit"
        ]
        text_lower = text.lower()
        return any(word in text_lower for word in vulgar_words)

    def get_context(self, query: str, detail: str = "concise", email_mode: bool = False) -> Dict[str, Any]:
        # Increase k for better initial coverage since we are skipping reranking
        docs = self.db.similarity_search_with_score(query, k=5)
        
        page_contents = []
        table = prettytable.PrettyTable()
        table.set_style(prettytable.MARKDOWN)
        table.field_names = ['Score', 'Chunk']
        
        for doc, score in docs:
            content = doc.page_content
            page_contents.append(content)
            # Truncate content for the table to keep it readable
            table.add_row([f"{score:.4f}", (content[:75] + '...') if len(content) > 75 else content])

        context = "\n\n".join(page_contents)
        model_content = f"Question: {query}\n\nContext:\n{context}"
        
        return {
            "model_content": model_content,
            "tooltip": table.get_string()
        }

    def chat_stream(self, messages: List[Dict[str, str]], detail: str = "concise", email_mode: bool = False) -> Generator[str, None, None]:
        if not messages:
            return

        last_query = messages[-1]['content']
        
        if self.check_vulgarity(last_query):
            yield "I kindly request you to maintain respectful and polite language. As representatives of KSBL, we uphold the values of courtesy and Islamic etiquette in all our interactions. JazakAllah Khair."
            return

        # Prepare system prompt
        active_system_prompt = prompts.anthropic_email_prompt if email_mode else prompts.anthropic_qa_prompt
        active_system_prompt = active_system_prompt.format(
            detail=detail,
            date_today=(datetime.now(timezone.utc) + timedelta(hours=5)).strftime("%d %B %Y")
        )

        # Get RAG context
        context_data = self.get_context(last_query, detail, email_mode)
        
        # Build API messages
        history = messages[:-1]
        api_messages = [{'role': 'system', 'content': active_system_prompt}]
        for m in history:
            content = m.get('model_content') or m.get('content') or "..."
            api_messages.append({'role': m['role'], 'content': content})
        
        # Ensure user content is never empty
        user_content = context_data.get('model_content') or f"Question: {last_query}"
        api_messages.append({'role': 'user', 'content': user_content})

        # Final safety check: remove any messages with empty content (though the above should prevent it)
        api_messages = [m for m in api_messages if m.get('content')]

        # Convert to LangChain message objects
        langchain_messages = []
        for m in api_messages:
            role = m['role']
            content = m['content']
            if role == 'system':
                langchain_messages.append(SystemMessage(content=content))
            elif role == 'user':
                langchain_messages.append(HumanMessage(content=content))
            elif role in ('assistant', 'model'):
                langchain_messages.append(AIMessage(content=content))

        # Stream using ChatOllama
        stream = self.llm.stream(langchain_messages)

        text_buffer = ""
        is_thinking = False
        for chunk in stream:
            delta = chunk.content or ""
            if not delta:
                continue
            
            text_buffer += delta
            
            while True:
                if not is_thinking:
                    if "<think>" in text_buffer:
                        parts = text_buffer.split("<think>", 1)
                        if parts[0]:
                            yield parts[0]
                        text_buffer = parts[1]
                        is_thinking = True
                    else:
                        tag_start = text_buffer.rfind("<")
                        if tag_start != -1 and "<think>".startswith(text_buffer[tag_start:]):
                            if tag_start > 0:
                                yield text_buffer[:tag_start]
                                text_buffer = text_buffer[tag_start:]
                            break
                        else:
                            yield text_buffer
                            text_buffer = ""
                            break
                else:
                    if "</think>" in text_buffer:
                        parts = text_buffer.split("</think>", 1)
                        text_buffer = parts[1]
                        is_thinking = False
                    else:
                        text_buffer = ""
                        break
