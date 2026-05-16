from knowledge_manager import KnowledgeManager

def main():
    km = KnowledgeManager()
    print("Ingesting initial handbook...")
    try:
        km.ingest_file("handbook.txt")
        print("Success!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
