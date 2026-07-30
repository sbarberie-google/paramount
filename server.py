import os
import json
import time
import urllib.request
import subprocess
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8200
PROJECT_STR = 'google.com:nextgen-sandbox'
PROJECT_NUM = '354292934503'
APP_ID = '7572ca8b-562f-4c38-bcea-5ef53dc2db5c'
DEPLOYMENT_ID = '03d74452-138d-4176-a6a3-4a2587f6956f'
# Configure CXAS Voice Model ID from Paramount+ App Schema (audioProcessingConfig)
VOICE_MODEL_NAME = 'en-US-Chirp3-HD-Erinome'

_token_cache = {"token": None, "fetched_at": 0}

def get_access_token():
    now = time.time()
    if not _token_cache["token"] or (now - _token_cache["fetched_at"]) > 1800:
        cmd = ['gcloud', 'auth', 'application-default', 'print-access-token']
        token = subprocess.check_output(cmd).decode().strip()
        _token_cache["token"] = token
        _token_cache["fetched_at"] = now
    return _token_cache["token"]

def synthesize_cxas_voice(text, voice_name=None):
    if not text or not text.strip():
        return None
    try:
        token = get_access_token()
        url = 'https://texttospeech.googleapis.com/v1/text:synthesize'
        headers = {
            'Authorization': f'Bearer {token}',
            'x-goog-user-project': PROJECT_NUM,
            'Content-Type': 'application/json'
        }
        
        # Clean markdown formatting for natural TTS playback
        clean_text = text.replace('*', '').replace('#', '').replace('`', '').replace('•', '').replace('-', ' ')
        selected_voice = voice_name or VOICE_MODEL_NAME

        body = {
            'input': {'text': clean_text[:1200]},
            'voice': {
                'languageCode': 'en-US',
                'name': selected_voice
            },
            'audioConfig': {
                'audioEncoding': 'MP3',
                'speakingRate': 1.02,
                'pitch': 0.0
            }
        }
        req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers, method='POST')
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode())
            return res.get('audioContent')
    except Exception as e:
        print(f"GCP Text-to-Speech Error: {e}")
        return None

def query_cxas_session(session_id, user_text, include_voice=True, voice_name=None):
    token = get_access_token()
    url = f'https://ces.googleapis.com/v1/projects/{PROJECT_STR}/locations/us/apps/{APP_ID}/sessions/{session_id}:runSession'
    headers = {
        'Authorization': f'Bearer {token}',
        'x-goog-user-project': PROJECT_NUM,
        'Content-Type': 'application/json'
    }

    body = {
        'deployment': f'projects/{PROJECT_STR}/locations/us/apps/{APP_ID}/deployments/{DEPLOYMENT_ID}',
        'inputs': [{'text': user_text}]
    }
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers, method='POST')
    
    try:
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode())
            outputs = res.get('outputs', [])
            agent_texts = [o.get('text') for o in outputs if o.get('text')]
            reply = " ".join(agent_texts) if agent_texts else "I'm sorry, I couldn't process that request."
            
            audio_content = None
            if include_voice and reply:
                audio_content = synthesize_cxas_voice(reply, voice_name=voice_name)

            return {
                "status": "success",
                "reply": reply,
                "audio_content": audio_content,
                "deployment": DEPLOYMENT_ID,
                "voice_engine": f"Google Cloud TTS ({voice_name or VOICE_MODEL_NAME})"
            }
    except Exception as e:
        print(f"CXAS API Error: {e}")
        return {"status": "error", "reply": f"⚠️ Error connecting to CXAS Agent: {str(e)}"}

class ParamountDemoHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="/usr/local/google/home/sbarberie/.gemini/jetski/scratch/paramount_demo_8200", **kwargs)

    def do_POST(self):
        if self.path == "/api/run-session":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                user_text = data.get('text', '')
                session_id = data.get('session_id', f'pplus-sess-{int(time.time())}')
                voice_name = data.get('voice_name', None)

                result = query_cxas_session(session_id, user_text, voice_name=voice_name)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "reply": str(e)}).encode('utf-8'))

        elif self.path == "/api/tts":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                text = data.get('text', '')
                voice_name = data.get('voice_name', None)
                audio_b64 = synthesize_cxas_voice(text, voice_name=voice_name)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "status": "success",
                    "audio_content": audio_b64,
                    "voice_engine": f"Google Cloud TTS ({voice_name or VOICE_MODEL_NAME})"
                }).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "reply": str(e)}).encode('utf-8'))

        else:
            self.send_error(404, "Endpoint not found")

def run():
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, ParamountDemoHandler)
    print(f"🎬 Paramount+ CXAS Demo Server running at http://localhost:{PORT}")
    print(f"   App ID: {APP_ID}")
    print(f"   Deployment ID: {DEPLOYMENT_ID}")
    print(f"   GECX Voice Engine: Google Cloud Text-to-Speech (en-US-Neural2-F)")
    httpd.serve_forever()

if __name__ == '__main__':
    run()
