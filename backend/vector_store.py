import os
import json
import logging
import faiss
import numpy as np

logger = logging.getLogger("sece-chatbot.vector_store")

# Configure Paths relative to this script (backend/vector_store.py -> project_root/index/)
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
INDEX_DIR = os.path.join(PROJECT_ROOT, "index")
INDEX_PATH = os.path.join(INDEX_DIR, "index.faiss")
METADATA_PATH = os.path.join(INDEX_DIR, "metadata.json")

class FAISSVectorStore:
    """Manages local FAISS vector store operations including vector normalization,
    indexing, searching, and saving/loading from disk.
    """
    def __init__(self):
        self.index = None
        self.metadata = []  # List of dicts, e.g., [{"chunk_id": "...", "text": "...", "source": "...", "category": "..."}]

    def build_index(self, embeddings: np.ndarray, metadata: list[dict]):
        """Populates the FAISS IndexFlatIP index with L2 normalized embeddings.
        
        Inner Product (IP) on L2 normalized vectors is equivalent to Cosine Similarity.
        """
        if len(embeddings) != len(metadata):
            raise ValueError(f"Size mismatch: {len(embeddings)} embeddings but {len(metadata)} metadata items.")
        
        logger.info(f"Building FAISS index with {len(embeddings)} items...")
        
        # Copy to avoid mutating original numpy array, then L2-normalize
        embeddings_norm = embeddings.copy().astype(np.float32)
        faiss.normalize_L2(embeddings_norm)
        
        dimension = embeddings_norm.shape[1]
        
        # IndexFlatIP uses Inner Product
        self.index = faiss.IndexFlatIP(dimension)
        self.index.add(embeddings_norm)
        self.metadata = metadata
        
        logger.info(f"FAISS index built. Total vectors: {self.index.ntotal}")

    def save(self):
        """Saves the FAISS index and metadata to disk."""
        if self.index is None:
            raise ValueError("Cannot save an uninitialized index.")
            
        logger.info(f"Saving vector database assets to {INDEX_DIR}...")
        os.makedirs(INDEX_DIR, exist_ok=True)
        
        # Save FAISS binary index
        faiss.write_index(self.index, INDEX_PATH)
        # Save chunks metadata
        with open(METADATA_PATH, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, indent=2, ensure_ascii=False)
            
        logger.info("Vector database assets saved successfully.")

    def load(self) -> bool:
        """Loads index and metadata assets from disk.
        
        Returns:
            bool: True if files were loaded successfully, False otherwise.
        """
        if os.path.exists(INDEX_PATH) and os.path.exists(METADATA_PATH):
            try:
                logger.info(f"Loading FAISS index from {INDEX_PATH}...")
                self.index = faiss.read_index(INDEX_PATH)
                
                logger.info(f"Loading metadata from {METADATA_PATH}...")
                with open(METADATA_PATH, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
                    
                logger.info(f"Index loaded. Total vectors: {self.index.ntotal}")
                return True
            except Exception as e:
                logger.error(f"Failed to load vector assets from disk: {e}")
                return False
        else:
            logger.warning("Vector database index or metadata file not found on disk.")
            return False

    def search(self, query_embedding: np.ndarray, k: int = 4) -> list[tuple[dict, float]]:
        """Searches the index for the top k closest vectors.
        
        Returns:
            list[tuple[dict, float]]: List of tuples containing (metadata_dict, cosine_similarity_score).
        """
        if self.index is None:
            raise ValueError("FAISS index is not initialized. Build or load the index first.")
            
        # Ensure query embedding is a 2D float32 array
        vec = query_embedding.copy().astype(np.float32)
        if len(vec.shape) == 1:
            vec = vec.reshape(1, -1)
            
        # L2 normalize the query vector
        faiss.normalize_L2(vec)
        
        # Query the FAISS index
        scores, indices = self.index.search(vec, k)
        
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx != -1 and idx < len(self.metadata):
                results.append((self.metadata[idx], float(score)))
            else:
                logger.warning(f"FAISS search returned out-of-bounds index {idx}")
                
        return results
