import streamlit as st
import os
import shutil
from langchain_chroma import Chroma
from langchain_voyageai import VoyageAIEmbeddings
from langchain_core.documents import Document

st.set_page_config(page_title="KSBLBot Admin", layout="wide")

st.sidebar.markdown("""
<style>
    [data-testid="stSidebarNav"] {display: none;}
</style>
""", unsafe_allow_html=True)
st.sidebar.page_link("mvp.py", label="User", icon="💬")
st.sidebar.page_link("pages/admin.py", label="Admin", icon="⚙️")

ADMIN_PASSWORD = "ksbl@admin2024"

CATEGORIES = ["admission", "program", "scholarship", "student_policy", "general"]

FIXED_FILES = {
    "general": "chunks.txt"
}

DATA_DIR = "admin_files"
os.makedirs(DATA_DIR, exist_ok=True)
for cat in CATEGORIES:
    os.makedirs(os.path.join(DATA_DIR, cat), exist_ok=True)

# Copy existing chunks.txt into general if not already there
general_fixed = os.path.join(DATA_DIR, "general", "chunks.txt")
if not os.path.exists(general_fixed) and os.path.exists("chunks.txt"):
    shutil.copy("chunks.txt", general_fixed)

# Auth
if "admin_authenticated" not in st.session_state:
    st.session_state.admin_authenticated = False

if not st.session_state.admin_authenticated:
    st.title("KSBLBot Admin Panel")
    st.subheader("Please log in")
    pwd = st.text_input("Password", type="password")
    if st.button("Login"):
        if pwd == ADMIN_PASSWORD:
            st.session_state.admin_authenticated = True
            st.rerun()
        else:
            st.error("Wrong password!")
    st.stop()

st.title("KSBLBot Admin Panel")
st.caption("Manage knowledge files and re-ingest into the chatbot database.")

tab1, tab2 = st.tabs(["📁 Manage Files", "🔄 Re-ingest Database"])

with tab1:
    col1, col2 = st.columns([1, 2])

    with col1:
        st.subheader("Categories & Files")
        selected_cat = st.selectbox("Select Category", CATEGORIES, format_func=lambda x: x.replace("_", " ").title())

        cat_dir = os.path.join(DATA_DIR, selected_cat)
        existing_files = os.listdir(cat_dir)

        st.write(f"**Files in {selected_cat.replace('_',' ').title()}:**")
        selected_file = None
        for f in existing_files:
            is_fixed = FIXED_FILES.get(selected_cat) == f
            label = f"📌 {f} (FIXED)" if is_fixed else f"📄 {f}"
            if st.button(label, key=f"btn_{selected_cat}_{f}"):
                st.session_state.selected_file = f
                st.session_state.selected_cat = selected_cat

        st.divider()
        st.write("**Create New File:**")
        new_filename = st.text_input("Filename (e.g. fall_2024_admissions)", key="new_file_input")
        if st.button("Create File"):
            if new_filename:
                fname = new_filename if new_filename.endswith(".txt") else new_filename + ".txt"
                fpath = os.path.join(cat_dir, fname)
                if os.path.exists(fpath):
                    st.warning("File already exists!")
                else:
                    with open(fpath, "w") as f:
                        f.write("")
                    st.success(f"Created {fname}!")
                    st.rerun()

    with col2:
        st.subheader("Edit File")

        edit_cat = st.session_state.get("selected_cat", selected_cat)
        edit_file = st.session_state.get("selected_file", None)

        if edit_file:
            fpath = os.path.join(DATA_DIR, edit_cat, edit_file)
            is_fixed = FIXED_FILES.get(edit_cat) == edit_file

            st.write(f"**Editing:** `{edit_cat}/{edit_file}`")
            if is_fixed:
                st.info("This is a FIXED file. You can edit its content but cannot rename or delete it.")

            with open(fpath, "r", encoding="utf-8") as f:
                current_content = f.read()

            new_content = st.text_area("File Content", value=current_content, height=450, key=f"editor_{edit_cat}_{edit_file}")

            col_save, col_del = st.columns([1, 1])
            with col_save:
                if st.button("💾 Save Changes", type="primary"):
                    with open(fpath, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    st.success("Saved!")

            with col_del:
                if not is_fixed:
                    if st.button("🗑️ Delete File", type="secondary"):
                        os.remove(fpath)
                        st.session_state.selected_file = None
                        st.success("Deleted!")
                        st.rerun()
        else:
            st.info("Select a file from the left to edit it, or create a new one.")

with tab2:
    st.subheader("Re-ingest All Files into Chatbot Database")
    st.warning("This will rebuild the entire knowledge database from all files. It may take a few minutes.")

    if st.button("🚀 Start Re-ingestion", type="primary"):
        with st.spinner("Reading all files..."):
            all_chunks = []
            for cat in CATEGORIES:
                cat_dir = os.path.join(DATA_DIR, cat)
                for fname in os.listdir(cat_dir):
                    fpath = os.path.join(cat_dir, fname)
                    with open(fpath, "r", encoding="utf-8") as f:
                        content = f.read()
                    chunks = content.split("----------")
                    for chunk in chunks:
                        chunk = chunk.strip()
                        if chunk:
                            all_chunks.append(Document(
                                page_content=chunk,
                                metadata={"source": fname, "category": cat}
                            ))

            st.info(f"Found {len(all_chunks)} chunks across all files. Embedding now...")

        with st.spinner("Creating embeddings (this takes a few minutes)..."):
            try:
                voyage_embeddings = VoyageAIEmbeddings(
                    voyage_api_key=st.secrets['VOYAGE_API_KEY'],
                    model='voyage-large-2',
                    truncation=False
                )

                if os.path.exists("./chroma_db"):
                    shutil.rmtree("./chroma_db")

                db = Chroma.from_documents(
                    all_chunks, voyage_embeddings, persist_directory='./chroma_db'
                )

                if 'rag_db' in st.session_state:
                    del st.session_state['rag_db']

                st.success(f"✅ Done! {len(all_chunks)} chunks ingested into the database. The chatbot will use the new data immediately.")
            except Exception as e:
                st.error(f"Error during ingestion: {e}")

    st.divider()
    st.subheader("File Summary")
    for cat in CATEGORIES:
        cat_dir = os.path.join(DATA_DIR, cat)
        files = os.listdir(cat_dir)
        st.write(f"**{cat.replace('_',' ').title()}:** {len(files)} file(s) — {', '.join(files) if files else 'none'}")
