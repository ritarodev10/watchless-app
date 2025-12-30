from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
import re
from youtube_transcript_api import YouTubeTranscriptApi
import http.cookiejar
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env

app = Flask(__name__)
# Vercel needs to know about CORS, though vercel.json usually handles rewrites. 
# Enabling CORS here is safer for direct access if needed.
CORS(app)

def get_video_title(video_id):
    try:
        url = f"https://www.youtube.com/watch?v={video_id}"
        resp = requests.get(url)
        match = re.search(r"<title>(.*?) - YouTube</title>", resp.text)
        if match:
            return match.group(1)
    except:
        pass
    return "Unknown Video"

@app.route('/api/transcript', methods=['GET'])
def get_transcript():
    video_id = request.args.get('videoId')
    should_summarize = request.args.get('summarize', 'false').lower() == 'true'

    if not video_id:
        return jsonify({"success": False, "error": "Missing videoId"}), 400

    # Setup Cookies logic from legacy
    script_dir = os.path.dirname(os.path.abspath(__file__))
    cookies_file = os.path.join(script_dir, 'cookies.txt')
    cookies_path = cookies_file if os.path.exists(cookies_file) else None
    
    if not cookies_path and os.environ.get('YOUTUBE_COOKIES'):
         cookies_path = '/tmp/cookies.txt'
         with open(cookies_path, 'w') as f:
             f.write(os.environ['YOUTUBE_COOKIES'])

    session = requests.Session()
    if cookies_path:
        try:
            cj = http.cookiejar.MozillaCookieJar(cookies_path)
            cj.load(ignore_discard=True, ignore_expires=True)
            session.cookies = cj
        except Exception as e:
            print(f"Cookie load error: {e}")

    result = {
        "success": False,
        "video_id": video_id,
        "title": "Unknown",
        "transcript": [],
        "summary": None
    }

    try:
        # 1. Fetch Title
        result['title'] = get_video_title(video_id)

        # 2. Fetch Transcript (Legacy Logic)
        try:
            # Instantiate API with session (Legacy way)
            # Check if user has a fork or older modified version that supports this
            try:
                ytt_api = YouTubeTranscriptApi(http_client=session)
            except:
                 # Fallback to static if instantiation fails (Standard library doesn't support init)
                 # But legacy file clearly used it. We will assume support.
                 ytt_api = YouTubeTranscriptApi() 
            
            transcript_data = None
            
            # Strategy 1: Fast fetch
            try:
                if hasattr(ytt_api, 'fetch'):
                     transcript_data = ytt_api.fetch(video_id, languages=['en', 'id', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'zh-Hans', 'zh-Hant'])
                else:
                     # Static usage fallback
                     transcript_data = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'id', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'zh-Hans', 'zh-Hant'])
            except Exception:
                pass

            # Strategy 2: List and translate
            if not transcript_data:
                transcript_list = None
                if hasattr(ytt_api, 'list'):
                    transcript_list = ytt_api.list(video_id)
                elif hasattr(ytt_api, 'list_transcripts'):
                    transcript_list = ytt_api.list_transcripts(video_id)
                else:
                    # Static fallback
                    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

                try:
                    transcript = transcript_list.find_transcript(['en'])
                except:
                    try:
                        transcript = next(iter(transcript_list)).translate('en')
                    except:
                        transcript = next(iter(transcript_list))
                
                transcript_data = transcript.fetch()

        except Exception as e:
            error_msg = str(e)
            if "Could not retrieve a transcript" in error_msg and not cookies_path:
                error_msg += " (YouTube Blocked IP? Try adding cookies)"
            return jsonify({"success": False, "error": error_msg}), 500

        # Format transcript
        serializable_transcript = []
        for entry in transcript_data:
            if isinstance(entry, dict):
                 serializable_transcript.append(entry)
            else:
                 serializable_transcript.append({
                     'text': getattr(entry, 'text', ''),
                     'start': getattr(entry, 'start', 0.0),
                     'duration': getattr(entry, 'duration', 0.0)
                 })
        result['transcript'] = serializable_transcript
        
        # 3. Summarize (if requested)
        if should_summarize:
            def format_timestamp(seconds):
                m, s = divmod(int(seconds), 60)
                h, m = divmod(m, 60)
                if h > 0:
                    return f"{h:02d}:{m:02d}:{s:02d}"
                return f"{m:02d}:{s:02d}"

            transcript_text = "\n".join([f"[{format_timestamp(t['start'])}] {t['text']}" for t in serializable_transcript])
            
            youtube_url = f"https://www.youtube.com/watch?v={video_id}"
            
            # System Prompt
            system_prompt = f"""
You are generating an **Obsidian-ready technical documentation**.
You are a **Technical Writer**.

**CRITICAL RULE:**
* ❌ NEVER say "The video explains...", "The speaker says...".
* ✅ WRITE as if you are the original author.
* ✅ Use imperative mood.
* ✅ Use **Bullet Points** and **Lists**.

**TIMESTAMP ACCURACY IS PARAMOUNT:**
* You **MUST** use the provided timestamps `[MM:SS]` for your headers.

---

## INPUT
* YouTube URL: {youtube_url}
* Video ID: {video_id}
* Video Title: {result['title']}

---

## REQUIRED OUTPUT STRUCTURE

### 0. Frontmatter & Header
Start with this exact YAML:
```yaml
---
type: bookmark
source: youtube
url: "{youtube_url}"
video_id: "{video_id}"
channel: "[[Channel]]"
tags: []
created: "Today"
---
```

# {result['title']}

<iframe width="100%" height="400" src="https://www.youtube.com/embed/{video_id}" frameborder="0" allowfullscreen></iframe>

### 1. Overview Section
`## Video Overview ([0:00]({youtube_url}&t=0s))`

![Video Thumbnail](https://img.youtube.com/vi/{video_id}/hqdefault.jpg)

[Write a concise technical overview.]

---

### 2. Core Documentation Sections
Format:
`## Meaningful Section Title ([MM:SS]({youtube_url}&t=SECONDS))`

[Content with bullets]

---

### 3. Quick Index
`## Quick Index`
* List of all sections with linked timestamps.
"""

            # Call OpenRouter API
            api_key = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("OPENAI_API_KEY")
            if not api_key:
                 return jsonify({"success": False, "error": "Missing API Key"}), 500

            headers = {
                "Authorization": f"Bearer {api_key}",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "WatchLess App",
                "Content-Type": "application/json"
            }

            payload = {
                "model": "bytedance-seed/seed-1.6-flash",
                "messages": [
                    { "role": "system", "content": system_prompt },
                    {
                        "role": "user", 
                        "content": f"Exhaustively document the following transcript into the Master Obsidian Format.\nTranscript:\n{transcript_text}"
                    }
                ],
                "max_tokens": 16384,
                "temperature": 0.3
            }

            try:
                ai_response = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=payload
                )
                
                if ai_response.status_code != 200:
                    raise Exception(f"AI Error ({ai_response.status_code}): {ai_response.text}")

                ai_data = ai_response.json()
                result['summary'] = ai_data['choices'][0]['message']['content']
            except Exception as e:
                return jsonify({"success": False, "error": str(e)}), 500

        result['success'] = True
        return jsonify(result)

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
