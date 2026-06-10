# Sri Eshwar College of Engineering (SECE) RAG Chatbot

A production-ready, Vercel-deployable Retrieval-Augmented Generation (RAG) chatbot for **Sri Eshwar College of Engineering (SECE), Coimbatore, Tamil Nadu**.

This chatbot features a dual-panel web dashboard: a **premium glassmorphic Chat window** and a **real-time Vector Search Inspector** that displays the retrieved text chunks and their exact cosine similarity scores.

## Architecture

This project is built using a cost-effective, high-performance RAG pipeline optimized for serverless environments (Vercel):

1. **Lightweight Vectorizer (TF-IDF):** Since Groq does not offer an embedding API, and loading heavy neural models (like `sentence-transformers`) on Vercel triggers size limit errors and high cold-start latency, the project uses a custom, NumPy-based **SimpleTFIDF** vectorizer. This generates dense floats that are fully compatible with FAISS, indexing the text in milliseconds.
2. **FAISS Vector Index:** Stores the normalized document vectors and retrieves the top 4 matched segments using Cosine Similarity (Inner Product on L2-normalized vectors).
3. **Groq LPU Inference (Llama 3.3):** Generates responses using the state-of-the-art `llama-3.3-70b-versatile` model, hosted on Groq for ultra-fast response times.
4. **Self-Healing Index:** The API dynamically constructs the TF-IDF vocabulary and FAISS index in memory at startup if prebuilt files are missing, ensuring 100% reliability on stateless serverless functions.

```
                  +--------------------------------+
                  |    data/knowledge_base.txt     |
                  +----------------+---------------+
                                   |
                                   v
                  +--------------------------------+
                  |  scripts/build_index.py        | (Local / Startup build)
                  +----------------+---------------+
                                   |
          +------------------------+------------------------+
          |                        |                        |
          v                        v                        v
+---------+----------+   +---------+----------+   +---------+----------+
| api/data/chunks.json|   |api/data/index.faiss|   | api/data/tfidf.json|
+---------+----------+   +---------+----------+   +---------+----------+
          |                        |                        |
          +------------------------+------------------------+
                                   |
                                   v
                  +--------------------------------+
                  |    api/index.py (FastAPI)      |
                  +----------------+---------------+
                                   ^
                                   | (POST /api/chat)
                                   v
                  +--------------------------------+
                  |     public/index.html (UI)     |
                  +--------------------------------+
```

---

## File Structure

```
sece-chatbot/
├── .env.example           # Template for environment variables
├── .env                   # Local environment variables (do not commit)
├── requirements.txt       # Python serverless dependencies
├── vercel.json            # Vercel routing configuration
├── package.json           # Vercel build script triggers
├── README.md              # Project documentation
├── data/
│   └── knowledge_base.txt # Raw information on SECE (Admissions, Academics, Placements...)
├── scripts/
│   ├── build_index.py     # Script to chunk text and compile the vector database
│   └── install_deps.py    # Helper script to install dependencies programmatically
├── api/
│   ├── index.py           # FastAPI backend serverless entrypoint
│   └── data/              # Output folder for pre-compiled vector assets
│       ├── chunks.json
│       ├── index.faiss
│       └── tfidf.json
├── public/                # Static assets served by Vercel edge router
│   ├── index.html         # Premium dashboard interface
│   ├── style.css          # Glassmorphism dark styling sheet
│   └── app.js             # Client query and inspector coordinator
└── tests/
    └── test_rag.py        # Automated RAG CLI test runner
```

---

## Local Setup & Installation

### Prerequisites
- Python 3.9, 3.10, 3.11, or 3.12 installed on your system.
- A Groq API Key (obtain from [console.groq.com](https://console.groq.com/)).

### 1. Clone & Initialize
Navigate to your project folder:
```bash
cd sece-chatbot
```

### 2. Configure Environment Variables
Copy the `.env.example` file and rename it to `.env`:
```bash
cp .env.example .env
```
Open `.env` and add your Groq API Key:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
```

### 3. Install Dependencies
Run the programmatic installer to set up all Python dependencies (including `fastapi`, `groq`, `numpy`, and `faiss-cpu`):
```bash
python scripts/install_deps.py
```
*(Alternatively: `pip install -r requirements.txt`)*

---

## Testing & Compilation

### 1. Build the Vector Index
Compile the knowledge base into the FAISS vector database:
```bash
python scripts/build_index.py
```
This chunks `data/knowledge_base.txt` into 150-word blocks with 20-word overlaps, vectorizes them, and saves the output to the `api/data/` folder.

### 2. Run the Automated RAG Test Suite
Run the test runner to evaluate the chatbot against 5 sample questions and 1 out-of-domain query:
```bash
python tests/test_rag.py
```
This outputs the top-matched FAISS text chunks, their cosine similarity scores, the model routing classification, and the generated response for each test case.

---

## Local Development Server

You can run the application locally using one of the following methods:

### Option A: Using Vercel CLI (Recommended)
This runs the local server in an environment identical to the Vercel cloud:
```bash
npm install -g vercel
vercel dev
```
Open your browser and navigate to `http://localhost:3000`.

### Option B: Using Uvicorn (Python Only)
If you don't have Node/Vercel CLI installed:
```bash
uvicorn api.index:app --reload --port 8000
```
Then, access the API endpoints locally on `http://127.0.0.1:8000/api/health`.
*(Note: In python-only mode, you will need to host a simple HTTP server in the root directory or load index.html using a browser extension to fetch from localhost:8000).*

---

## API Endpoints

### 1. Chat Completion Endpoint
*   **Path:** `/api/chat`
*   **Method:** `POST`
*   **Request Header:** `Content-Type: application/json`
*   **Request Body:**
    ```json
    {
      "message": "What is the TNEA code for Sri Eshwar College of Engineering?"
    }
    ```
*   **Response Body:**
    ```json
    {
      "answer": "The TNEA code for Sri Eshwar College of Engineering is 2739.",
      "sources": [
        {
          "text": "Sri Eshwar College of Engineering (SECE) is a premier... TNEA code 2739...",
          "score": 0.8427
        }
      ]
    }
    ```

### 2. Health Monitoring Endpoint
*   **Path:** `/api/health`
*   **Method:** `GET`
*   **Response Body:**
    ```json
    {
      "status": "healthy",
      "database_loaded": true,
      "api_key_configured": true,
      "total_vectors": 8,
      "total_chunks": 8
    }
    ```

---

## Vercel Deployment

Deploying the SECE RAG Chatbot to Vercel takes just a few steps:

### Step 1: Push to GitHub
Commit your project files and push them to a Git repository (GitHub, GitLab, or Bitbucket):
```bash
git init
git add .
git commit -m "Initialize SECE RAG Chatbot"
# Push to your remote repository...
```

### Step 2: Import Project to Vercel
1. Log in to your Vercel Dashboard at [vercel.com](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Select your repository from the imported list.

### Step 3: Configure Environment Variables
Before clicking Deploy, expand the **Environment Variables** section and add:
- **Key:** `GROQ_API_KEY`
- **Value:** *Your actual Groq API Key* (e.g. `gsk_...`)

### Step 4: Deploy
Click **Deploy**. Vercel will automatically detect the static frontend in the `public/` directory and build the serverless API function in `api/index.py` using `vercel.json` rewrites. Once build completes, Vercel will provide you with a public production URL (e.g. `https://sece-rag-chatbot.vercel.app`).
