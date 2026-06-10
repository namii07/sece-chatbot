"""
Pre-build script: parses sece_knowledge_base.txt, generates SentenceTransformer
embeddings, and saves the FAISS index + metadata to index/ for the backend to load.

Run from project root:
    python scripts/build_index.py
"""
import os
import sys

# Ensure project root is on path so backend imports resolve
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.retriever import parse_knowledge_base, KB_PATH
from backend.embeddings import get_embeddings
from backend.vector_store import FAISSVectorStore


def build():
    print("=" * 60)
    print("SECE RAG — Building SentenceTransformer + FAISS Index")
    print("=" * 60)

    print(f"Reading knowledge base from: {KB_PATH}")
    chunks = parse_knowledge_base(KB_PATH)
    print(f"Parsed {len(chunks)} chunks.")

    print("Generating SentenceTransformer embeddings...")
    texts = [c["text"] for c in chunks]
    embeddings = get_embeddings(texts)
    print(f"Generated embeddings: shape {embeddings.shape}")

    print("Building FAISS IndexFlatIP (cosine similarity)...")
    store = FAISSVectorStore()
    store.build_index(embeddings, chunks)

    print("Saving index and metadata to index/...")
    store.save()

    print("=" * 60)
    print(f"Done. {store.index.ntotal} vectors indexed.")
    print("=" * 60)


if __name__ == "__main__":
    build()
