import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from backend.rag import SECEChatbotRAG

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("sece-chatbot.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Instantiates and initializes the RAG pipeline on startup."""
    logger.info("Starting up SECE RAG Chatbot Backend...")
    app.state.rag = SECEChatbotRAG()
    success = app.state.rag.initialize()
    if success:
        logger.info("RAG Pipeline successfully initialized and ready.")
    else:
        logger.error("RAG Pipeline failed to initialize on startup.")
    yield
    logger.info("Shutting down SECE RAG Chatbot Backend...")


app = FastAPI(
    title="SECE RAG Chatbot API",
    description="FastAPI backend for Sri Eshwar College of Engineering (SECE) Chatbot using FAISS and Groq Llama 3.3.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str = Field(..., description="The query message from the user", examples=["What is the TNEA code of SECE?"])


class SourceItem(BaseModel):
    chunk_id: str
    text: str
    category: str
    source: str


class ChatResponse(BaseModel):
    answer: str
    retrieval_scores: list[float]
    sources: list[SourceItem]


class HealthResponse(BaseModel):
    status: str
    database_loaded: bool
    api_key_configured: bool
    total_vectors: int
    total_chunks: int


@app.post("/chat", response_model=ChatResponse)
@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """Processes chatbot queries by retrieving context and generating an answer."""
    logger.info(f"Received query: {request.message[:100]}")
    try:
        rag: SECEChatbotRAG = app.state.rag
        response = rag.generate_answer(request.message)
        return ChatResponse(
            answer=response["answer"],
            retrieval_scores=response["retrieval_scores"],
            sources=[SourceItem(**s) for s in response["sources"]],
        )
    except Exception as e:
        logger.exception("Error processing chat query:")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@app.get("/health", response_model=HealthResponse)
@app.get("/api/health", response_model=HealthResponse)
async def health_endpoint():
    """Returns the initialization status of the FAISS database and Groq API."""
    rag: SECEChatbotRAG = app.state.rag
    vector_store = rag.retriever.vector_store
    db_loaded = vector_store.index is not None and len(vector_store.metadata) > 0
    api_key_configured = rag.client is not None
    total_vectors = vector_store.index.ntotal if vector_store.index is not None else 0
    total_chunks = len(vector_store.metadata)

    return HealthResponse(
        status="healthy" if db_loaded and api_key_configured else "degraded",
        database_loaded=db_loaded,
        api_key_configured=api_key_configured,
        total_vectors=total_vectors,
        total_chunks=total_chunks,
    )
