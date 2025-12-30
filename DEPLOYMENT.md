# WatchLess Deployment Guide

This application uses a **hybrid architecture**:
*   **Frontend:** Next.js (App Router)
*   **Backend:** Python via Flask (Locally) and Vercel Serverless Functions (Production)

---

## 1. Local Development
For local development, we run the Python backend independently to avoid Vercel emulation issues.

**Requirements:**
*   Node.js (v18+)
*   Python 3.9+
*   `pip` libraries: `flask`, `flask-cors`, `requests`, `youtube-transcript-api`, `python-dotenv`

### Steps
1.  **Configure Environment:**
    Ensure you have a `.env` file in the `watchless/` folder:
    ```bash
    OPENROUTER_API_KEY=sk-or-your-key-here
    # Optional: YOUTUBE_COOKIES (if not using cookies.txt file)
    ```

2.  **Start Python Server (Terminal 1):**
    ```bash
    cd watchless
    python3 python_server.py
    ```
    *Runs on http://127.0.0.1:5328*

3.  **Start Next.js App (Terminal 2):**
    ```bash
    cd watchless
    npm run dev
    ```
    *Runs on http://localhost:3000*

Next.js is configured via `next.config.ts` to automatically proxy all `/api/*` requests to the running Python server.

---

## 2. Production Deployment (Vercel)
In deployment, Vercel automatically effectively "merges" the two. `api/index.py` becomes a Serverless Function serving `/api`.

### Prerequisites
*   Vercel CLI installed (`npm i -g vercel`)
*   Vercel Account

### Steps
1.  **Deploy:**
    Run this command from the `watchless/` directory:
    ```bash
    vercel deploy --prod
    ```

2.  **Configure Environment Variables (CRITICAL):**
    Go to your Project Settings on Vercel Dashboard -> Environment Variables.

    *   `OPENROUTER_API_KEY`: Your AI API Key.
    *   `YOUTUBE_COOKIES`: **Required for reliability.**
        *   Copy the **entire content** of your local `cookies.txt` file.
        *   Paste it as the value for this variable.
        *   *Reason: YouTube often blocks data center IPs (like Vercel's). Providing cookies authenticates the request as a real user.*

### Troubleshooting Vercel Deployments
*   **404 on API:** Ensure `vercel.json` has the correct rewrites (already configured).
*   **500 Internal Server Error:** Check Vercel Logs. Usually indicates a missing Environment Variable (like `OPENROUTER_API_KEY`) or an issue with the Python dependencies.
*   **"Sign in to verify you're not a bot":** This means `YOUTUBE_COOKIES` is missing or expired. Update the environment variable with fresh cookies.
