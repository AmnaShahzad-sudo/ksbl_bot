import os
import time
from ollama import Client

def ensure_model_pulled(model_name: str, base_url: str = None):
    """
    Checks if model_name is installed on Ollama. If not, pulls it.
    """
    host = base_url or os.getenv("LLM_BASE_URL") or "http://localhost:11434"
    print(f"Ensuring model '{model_name}' is available on Ollama host: {host}")
    client = Client(host=host)
    
    # Wait for Ollama to be ready (up to 30 seconds)
    retries = 6
    for i in range(retries):
        try:
            response = client.list()
            break
        except Exception as e:
            if i == retries - 1:
                print(f"Warning: Could not connect to Ollama host {host} after {retries} retries. Skipping automatic pull.")
                return
            print(f"Waiting for Ollama to start (retry {i+1}/{retries})...")
            time.sleep(5)
            
    try:
        models = response.get('models', [])
        model_names = []
        for m in models:
            if isinstance(m, dict):
                name = m.get('name', m.get('model', ''))
            else:
                name = getattr(m, 'name', getattr(m, 'model', ''))
            model_names.append(name.split(':')[0])
            model_names.append(name)
            
        check_name = model_name.split(':')[0]
        if model_name in model_names or check_name in model_names:
            print(f"Model '{model_name}' is already installed.")
            return

        print(f"Model '{model_name}' not found. Pulling model...")
        client.pull(model_name)
        print(f"Model '{model_name}' pulled successfully.")
    except Exception as e:
        print(f"Error checking/pulling model '{model_name}': {e}")
