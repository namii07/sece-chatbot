import os
import sys
import logging

# Ensure project root is in the Python search path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.rag import SECEChatbotRAG, FALLBACK_RESPONSE

# Configure logging to only show RAG and application logs, suppress library noise
logging.basicConfig(level=logging.INFO, format="%(levelname)s - %(message)s")
logging.getLogger("sentence_transformers").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)

def run_test_suite():
    print("=" * 90)
    print("SECE RAG CHATBOT AUTOMATED TEST SUITE (SENTENCE TRANSFORMERS + FAISS + GROQ)")
    print("=" * 90)
    
    # 1. Initialize RAG pipeline
    rag = SECEChatbotRAG()
    success = rag.initialize()
    if not success:
        print("[ERROR] Failed to initialize RAG pipeline assets. Test aborted.")
        return
        
    print("[SUCCESS] RAG Pipeline assets initialized successfully.")
    print("-" * 90)
    
    # 2. Define test questions
    test_questions = [
        "What is the TNEA code of SECE?",
        "What departments are available?",
        "Tell me about placements.",
        "What facilities are available?",
        "Tell me about international internships?",
        "Who won the FIFA World Cup 2022?"
      ]
      
    # 3. Execute test cases
    for idx, q in enumerate(test_questions, 1):
        print(f"\nTEST CASE #{idx}: Question: \"{q}\"")
        print("-" * 60)
        
        # Call RAG pipeline
        response = rag.generate_answer(q)
        answer = response["answer"]
        scores = response["retrieval_scores"]
        sources = response["sources"]
        
        # Print retrieved details
        print("FAISS Vector Retrieval Metrics:")
        if not sources:
            print("  [None] - No chunks retrieved (or skipped due to below-threshold similarity)")
        else:
            for rank, (score, src) in enumerate(zip(scores, sources), 1):
                print(f"  [{rank}] Score: {score:.4f} | Category: [{src['category']}] | Text preview: {src['text'][:90]}...")
                
        print(f"\nFinal Chatbot Answer:")
        print(f"\"{answer}\"")
        
        # Validate out-of-domain fallback string
        if q == "Who won the FIFA World Cup 2022?":
            is_valid = answer == FALLBACK_RESPONSE
            status_str = "PASSED" if is_valid else "FAILED"
            print(f"\nOut-of-Domain Validation: {status_str} (Expected exact fallback response)")
            if not is_valid:
                print(f"  Expected: \"{FALLBACK_RESPONSE}\"")
                print(f"  Received: \"{answer}\"")
                
        print("=" * 90)

if __name__ == "__main__":
    run_test_suite()
