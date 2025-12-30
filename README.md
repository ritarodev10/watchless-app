# WatchLess (Next.js Edition)

An elegant, Obsidian-ready YouTube summarizer that runs on **Next.js** and **Vercel Serverless Functions**.

## 🚀 Getting Started

Unlike standard Next.js apps, this project uses **Python Serverless Functions** for the backend. You cannot just run `npm run dev`.

### Prerequisites
1.  **Node.js** & **npm**
2.  **Python 3.9+**
3.  **Vercel CLI**: `npm i -g vercel`

### Local Development

1.  **Install Dependencies**:
    ```bash
    npm install
    # Python deps are handled by Vercel automatically in actual deploy, 
    # but for local dev you might want to install them if running purely local python scripts:
    pip install -r requirements.txt
    ```

2.  **Setup Environment**:
    Create a `.env.local` file:
    ```bash
    OPENROUTER_API_KEY=sk-or-your-key-here
    ```

3.  **Cookies (Important)**:
    YouTube blocks automated requests. You need a `cookies.txt` file in the root of this folder for local development.
    *   *Note: This file is ignored by git for security.*

4.  **Run the App**:
    ```bash
    vercel dev
    ```
    *   This starts the Next.js frontend AND the Python backend emulation.
    *   Open `http://localhost:3000`.

## 📦 Deployment to Vercel

1.  **Push to GitHub**:
    Initialize a repo and push this folder.

2.  **Import to Vercel**:
    *   Go to Vercel Dashboard -> Add New Project.
    *   Select your repo.
    *   **Framework Preset**: Next.js.
    *   **Environment Variables**:
        *   `OPENROUTER_API_KEY`: Your API Key.
        *   `YOUTUBE_COOKIES`: **(Critical)** Copy the *entire content* of your `cookies.txt` and paste it here. The app will reconstruct the file at runtime.

3.  **Deploy**:
    Click Deploy. Vercel will build the frontend and set up the Python runtime automatically.

## 🛠 Architecture

*   **Frontend**: Next.js 14+ (App Router), Tailwind CSS v4, Lucide React.
*   **Backend**: Python 3 Runtime (Vercel Serverless Class).
*   **API**: `/api/transcript` -> Maps to `api/transcript.py`.

## 📄 License

Private / Proprietary.
