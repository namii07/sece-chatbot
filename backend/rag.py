import os
import logging
from groq import Groq
from dotenv import load_dotenv
from backend.retriever import RAGRetriever

# Load environment variables
load_dotenv()

logger = logging.getLogger("sece-chatbot.rag")

# Fallback response requirement
FALLBACK_RESPONSE = "I could not find that information in the SECE knowledge base. Please refer to https://sece.ac.in"

# Relevance threshold for sentence-transformers/all-MiniLM-L6-v2 embeddings
# (Inner Product / Cosine Similarity of normalized vectors)
RELEVANCE_THRESHOLD = 0.25

class SECEChatbotRAG:
    """Manages the full RAG pipeline: retrieves relevant chunks, evaluates relevance,
    constructs strict prompts, and queries the Groq Llama 3.3 model.
    """
    def __init__(self):
        self.retriever = RAGRetriever()
        
        # Verify and initialize Groq client
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            logger.error("GROQ_API_KEY environment variable is not set!")
            self.client = None
        else:
            try:
                self.client = Groq(api_key=api_key)
                logger.info("Groq client successfully initialized.")
            except Exception as e:
                logger.exception(f"Failed to initialize Groq client: {e}")
                self.client = None

    def initialize(self):
        """Initializes the retriever (loads or builds the vector database)."""
        logger.info("Initializing RAG Retriever...")
        return self.retriever.load_or_build_index()

    def generate_answer(self, message: str) -> dict:
        """Executes the complete RAG loop for a user message.
        
        Returns:
            dict: {
                "answer": str,
                "retrieval_scores": list[float],
                "sources": list[dict]
            }
        """
        query = message.strip()
        if not query:
            return {
                "answer": "Please provide a valid query.",
                "retrieval_scores": [],
                "sources": []
            }
            
        # 1. Retrieve the top 4 chunks
        logger.info(f"Retrieving context for query: '{query}'")
        retrieved_chunks = self.retriever.retrieve(query, k=4)
        
        # Extract retrieval scores and sources
        scores = [chunk["score"] for chunk in retrieved_chunks]
        sources = [
            {
                "chunk_id": chunk["chunk_id"],
                "text": chunk["text"],
                "category": chunk["category"],
                "source": chunk["source"]
            }
            for chunk in retrieved_chunks
        ]
        
        # Determine maximum score
        max_score = max(scores) if scores else 0.0
        logger.info(f"Top retrieval score: {max_score:.4f} (Threshold: {RELEVANCE_THRESHOLD})")
        
        # 2. Check Relevance Threshold
        if max_score < RELEVANCE_THRESHOLD or not retrieved_chunks:
            logger.info("Highest similarity score below threshold. Returning fallback directly.")
            return {
                "answer": FALLBACK_RESPONSE,
                "retrieval_scores": scores,
                "sources": []
            }
            
        # 3. Check Groq Client State
        if not self.client:
            logger.error("Groq client is not available. Cannot generate answer.")
            return {
                "answer": "The generation backend is currently unavailable (Groq client not initialized).",
                "retrieval_scores": scores,
                "sources": sources
            }
            
        # 4. Generate Answer using Groq (llama-3.3-70b-versatile)
        # Construct the context text
        context_blocks = []
        for i, chunk in enumerate(retrieved_chunks):
            context_blocks.append(
                f"[Source {i+1}]:\n"
                f"Text: {chunk['text']}\n"
                f"Category: {chunk['category']}\n"
                f"URL: {chunk['source']}"
            )
        context_text = "\n\n".join(context_blocks)
        
        system_instruction = (
            "You are the official SECE Information Assistant for Sri Eshwar College of Engineering (SECE), Coimbatore.\n"
            "Your task is to answer the user's question using ONLY the provided retrieved context database below.\n\n"
            "Rules:\n"
            "1. Answer ONLY using details from the retrieved context. Do NOT use any outside knowledge.\n"
            "2. Never hallucinate details. Be factually accurate and precise.\n"
            "3. If the answer cannot be found in the provided context, or if the question is unrelated to SECE, you must reply EXACTLY with this text and nothing else:\n"
            f"   \"{FALLBACK_RESPONSE}\"\n"
            "4. Include source citations in your answer. Refer to the sources as [Category Name] or cite the URLs directly (e.g. \"As per [About SECE], ...\" or \"Details can be found on https://sece.ac.in\"). Maintain a professional and helpful tone."
        )
        
        prompt = f"""
Retrieved Context Database:
-------------------------
{context_text}
-------------------------

User Question: {query}
"""
        try:
            logger.info("Requesting Llama 3.3 70B inference from Groq...")
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": system_instruction
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.2,
                max_tokens=800
            )
            
            answer = response.choices[0].message.content.strip()
            logger.info("Response received successfully from Groq.")
            
            # Only replace with fallback if the LLM explicitly chose to output it as the
            # entire response (not just mentioning the URL as a citation inside a real answer)
            if answer.strip() == FALLBACK_RESPONSE:
                answer = FALLBACK_RESPONSE
                
            return {
                "answer": answer,
                "retrieval_scores": scores,
                "sources": sources
            }
            
        except Exception as e:
            logger.exception(f"Groq API call failed: {e}")
            return {
                "answer": f"Error generating answer: {str(e)}",
                "retrieval_scores": scores,
                "sources": sources
            }
