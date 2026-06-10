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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout for cold starts
  try {
    const response = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send message: ${response.statusText}. ${errorText}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkBackendHealth(): Promise<HealthResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
  try {
    const response = await fetch(`${BASE}/api/health`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Failed to verify health: ${response.statusText}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}
