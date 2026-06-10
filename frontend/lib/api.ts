const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

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

export async function sendChatMessage(message: string): Promise<ChatResponse> {
  const response = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send message: ${response.statusText}. ${errorText}`);
  }
  return response.json();
}

export async function checkBackendHealth(): Promise<HealthResponse> {
  const response = await fetch(`${BASE}/api/health`);
  if (!response.ok) {
    throw new Error(`Failed to verify health: ${response.statusText}`);
  }
  return response.json();
}
