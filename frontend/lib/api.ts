export interface SourceItem {
  chunk_id: string;
  text: string;
  category: string;
  source: string;
}

export interface ChatResponse {
  answer: string;
  retrieval_scores: number[];
  sources: SourceItem[];
}

export interface HealthResponse {
  status: string;
  database_loaded: boolean;
  api_key_configured: boolean;
}

/**
 * Sends a message to the FastAPI backend and retrieves the answer and search details.
 */
export async function sendChatMessage(message: string): Promise<ChatResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send message: ${response.statusText}. ${errorText}`);
  }

  return response.json();
}

/**
 * Checks the status of the RAG backend (model key loaded, FAISS vector loaded).
 */
export async function checkBackendHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/health");
  if (!response.ok) {
    throw new Error(`Failed to verify health: ${response.statusText}`);
  }
  return response.json();
}
