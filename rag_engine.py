import os
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Generator
import prettytable
from groq import Groq
from langchain_community.vectorstores import chroma
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
import prompts

class KSBLBotEngine:
    def __init__(self, groq_api_key: str, chroma_db_path: str = "./chroma_db"):
        self.groq_client = Groq(api_key=groq_api_key)
        
        # FastEmbed is a lightweight, high-performance local embedding model
        self.embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
        
        self.db = chroma.Chroma(
            persist_directory=chroma_db_path, 
            embedding_function=self.embeddings
        )
        
        with open('system-prompt.txt', 'r', encoding='utf-8') as f:
            self.base_system_prompt = f.read()

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
            api_messages.append({'role': m['role'], 'content': m.get('model_content', m['content'])})
        
        api_messages.append({'role': 'user', 'content': context_data['model_content']})

        # Groq stream with filtering
        stream = self.groq_client.chat.completions.create(
            model="qwen/qwen3-32b",
            max_tokens=1000,
            temperature=0.0,
            messages=api_messages,
            stream=True,
        )

        text_buffer = ""
        is_thinking = False
        for chunk in stream:
            delta = chunk.choices[0].delta.content or ""
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
