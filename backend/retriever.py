import os
import re
import logging
from backend.embeddings import get_embeddings
from backend.vector_store import FAISSVectorStore

logger = logging.getLogger("sece-chatbot.retriever")

# Configure Paths relative to this script
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
KB_PATH = os.path.join(PROJECT_ROOT, "data", "sece_knowledge_base.txt")

# Mapping of section titles to Category and Source URL
SECTION_METADATA_MAP = {
    "about sri eshwar college of engineering (sece)": {
        "category": "About SECE",
        "source": "https://sece.ac.in"
    },
    "academic departments": {
        "category": "Departments",
        "source": "https://sece.ac.in"
    },
    "mechanical engineering department": {
        "category": "Departments",
        "source": "https://sece.ac.in"
    },
    "computer science and engineering department": {
        "category": "Departments",
        "source": "https://sece.ac.in"
    },
    "electronics and communication engineering department": {
        "category": "Departments",
        "source": "https://sece.ac.in"
    },
    "admissions process": {
        "category": "Admissions",
        "source": "https://sece.ac.in"
    },
    "academics and curriculum": {
        "category": "Academics",
        "source": "https://erp.sece.ac.in"
    },
    "research and development": {
        "category": "Research",
        "source": "https://sece.ac.in"
    },
    "innovation and entrepreneurship": {
        "category": "Innovation",
        "source": "https://sece.ac.in"
    },
    "training and placements": {
        "category": "Placements",
        "source": "https://sece.ac.in"
    },
    "international alliances and global mobility": {
        "category": "International Relations",
        "source": "https://sece.ac.in"
    },
    "campus facilities and infrastructure": {
        "category": "Facilities",
        "source": "https://campustour.sece.ac.in"
    },
    "contact information and web portals": {
        "category": "Contact",
        "source": "https://sece.ac.in"
    }
}

def chunk_text(text: str, chunk_size: int = 150, overlap: int = 20) -> list[str]:
    """Helper function to split a string into chunks of `chunk_size` words with `overlap` words overlap."""
    words = text.split()
    chunks = []
    if not words:
        return chunks
    
    i = 0
    while i < len(words):
        chunk_words = words[i:i + chunk_size]
        chunks.append(" ".join(chunk_words))
        i += (chunk_size - overlap)
        if len(chunk_words) < chunk_size:
            break
            
    return chunks

def parse_knowledge_base(file_path: str) -> list[dict]:
    """Parses sece_knowledge_base.txt and chunks sections with metadata."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Knowledge base file not found at: {file_path}")
        
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Split content by markdown sub-headings (e.g. ## About SECE)
    sections = re.split(r'\n##\s+', content)
    chunks_with_metadata = []
    chunk_index = 0
    
    # Process the first section (header info, typically ignored or parsed if it contains information)
    first_section = sections[0].strip()
    if first_section.startswith("#"):
        # Header line, skip or treat as general info
        pass
        
    for section in sections[1:]:
        section = section.strip()
        if not section:
            continue
            
        # Extract title and body
        lines = section.split("\n", 1)
        title = lines[0].strip()
        body = lines[1].strip() if len(lines) > 1 else ""
        
        # Determine Category & Source based on Title
        title_lower = title.lower()
        metadata_cfg = SECTION_METADATA_MAP.get(title_lower, {
            "category": "General",
            "source": "https://sece.ac.in"
        })
        
        # Split body into chunks of 150 words with 20 words overlap
        text_chunks = chunk_text(body, chunk_size=150, overlap=20)
        
        for text in text_chunks:
            chunks_with_metadata.append({
                "chunk_id": f"chunk_{chunk_index}",
                "text": text,
                "category": metadata_cfg["category"],
                "source": metadata_cfg["source"]
            })
            chunk_index += 1
            
    return chunks_with_metadata

class RAGRetriever:
    """Handles index loading, parsing, embedding generation, and searching."""
    def __init__(self):
        self.vector_store = FAISSVectorStore()
        
    def load_or_build_index(self):
        """Loads index from disk. If missing, parses raw file, compiles index, and saves to disk."""
        if self.vector_store.load():
            logger.info("Index successfully loaded from disk.")
            return True
            
        logger.info("Index assets not found on disk. Initiating build process from knowledge base...")
        try:
            # Parse knowledge base
            metadata_chunks = parse_knowledge_base(KB_PATH)
            logger.info(f"Parsed {len(metadata_chunks)} chunks from knowledge base.")
            
            # Generate embeddings
            texts = [c["text"] for c in metadata_chunks]
            embeddings = get_embeddings(texts)
            
            # Build index
            self.vector_store.build_index(embeddings, metadata_chunks)
            
            # Save index to disk
            self.vector_store.save()
            return True
        except Exception as e:
            logger.exception(f"Failed to build and save vector database index: {e}")
            return False

    def retrieve(self, query: str, k: int = 4) -> list[dict]:
        """Retrieves top k matching chunks with score and metadata.
        
        Each item returned is a dictionary of the form:
        {
            "chunk_id": "...",
            "text": "...",
            "category": "...",
            "source": "...",
            "score": 0.85
        }
        """
        # Generate query embedding
        query_embedding = get_embeddings([query])[0]
        
        # Search FAISS vector store
        search_results = self.vector_store.search(query_embedding, k=k)
        
        retrieved = []
        for metadata, score in search_results:
            item = metadata.copy()
            item["score"] = score
            retrieved.append(item)
            
        return retrieved
