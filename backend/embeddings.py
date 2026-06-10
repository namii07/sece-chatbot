import logging
import numpy as np
from fastembed import TextEmbedding

logger = logging.getLogger("sece-chatbot.embeddings")

_model = None

def get_embedding_model() -> TextEmbedding:
    global _model
    if _model is None:
        logger.info("Loading fastembed model 'sentence-transformers/all-MiniLM-L6-v2'...")
        _model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
        logger.info("fastembed model loaded successfully.")
    return _model

def get_embeddings(texts: list[str]) -> np.ndarray:
    """Generates L2-normalized 384-dim embeddings via fastembed ONNX runtime."""
    if not texts:
        return np.empty((0, 384), dtype=np.float32)
    model = get_embedding_model()
    embeddings = np.array(list(model.embed(texts)), dtype=np.float32)
    return embeddings
