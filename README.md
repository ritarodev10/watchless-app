# WatchLess (Next.js Edition)

An elegant, Obsidian-ready YouTube summarizer that runs on **Next.js** and **Vercel Serverless Functions**.

## 🚀 Getting Started

This project uses a hybrid architecture:
*   **Local Development:** Independent Python Flask Server + Next.js Proxy (Reliable & fast).
*   **Production:** Vercel Serverless Functions (Automatic & scalable).

### Prerequisites
1.  **Node.js (v18+)**
2.  **Python 3.9+**

### 1. Installation

**Frontend:**
```bash
npm install
```

**Backend (Python):**
```bash
pip install -r requirements.txt
```
*(If pip is not found, try `python3 -m pip install -r requirements.txt`)*

### 2. Configuration
1.  Create a `.env` file in the root:
    ```bash
    OPENROUTER_API_KEY=sk-your-key-here
    ```

2.  **Cookies (Critical):**
    YouTube often blocks automated requests (429/403). To fix this:
    *   Export cookies from YouTube using a browser extension (in Netscape format).
    *   Save them as `cookies.txt` in this folder.
    *   *Note: This file is ignored by git for security.*

### 3. Running Locally (The "Two Terminal" Method)

Because Vercel's local emulation can be buggy, we run the backend and frontend separately.

**Terminal 1 (Backend):**
```bash
python3 python_server.py
```
*Starts the raw Flask server on port 5328.*

**Terminal 2 (Frontend):**
```bash
npm run dev
```
*Starts Next.js on localhost:3000. It is configured to proxy all `/api/*` requests to the Python server automatically.*

Open **[http://localhost:3000](http://localhost:3000)** to use the app.

---

## 📦 Deployment to Vercel

1.  **Push to GitHub.**

2.  **Import to Vercel:**
    *   Go to Vercel Dashboard -> Add New Project -> Import Repository.

3.  **Environment Variables (CRITICAL):**
    Before deploying (or in Settings), add:
    *   `OPENROUTER_API_KEY`: Your API Key.
    *   `YOUTUBE_COOKIES`: **Copy and paste the entire text content of your `cookies.txt` here.**
        *(This ensures the production server is authenticated as a real user).*

4.  **Deploy.**
    Vercel will automatically detect `api/index.py` and deploy it as a Serverless Function.

## 🛠 Architecture

*   **Frontend**: Next.js 16 (App Router), Tailwind CSS v4.
*   **Local Backend**: Flask (`python_server.py`).
*   **Prod Backend**: Vercel Serverless (`api/index.py`).
