import logging
import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger("sece-chatbot.embeddings")

_model = None

def get_embedding_model() -> SentenceTransformer:
    """Gets or initializes the cached SentenceTransformer model instance."""
    global _model
    if _model is None:
        logger.info("Loading SentenceTransformer model 'sentence-transformers/all-MiniLM-L6-v2'...")
        # Load the model. This will download it to local cache directory if not already cached.
        _model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        logger.info("SentenceTransformer model loaded successfully.")
    return _model

def get_embeddings(texts: list[str]) -> np.ndarray:
    """Generates embedding vectors for a list of input texts.
    
    Returns:
        np.ndarray of shape (len(texts), 384)
    """
    if not texts:
        return np.empty((0, 384), dtype=np.float32)
    
    model = get_embedding_model()
    embeddings = model.encode(texts, convert_to_numpy=True)
    return embeddings.astype(np.float32)
