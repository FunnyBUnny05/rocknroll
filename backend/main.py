from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import subprocess
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

from orchestrator import run_audio_to_chords_pipeline

app = FastAPI(title="GhostGuitar Heavy ML Backend")

# Enable CORS for the Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production restrict to the github pages url
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "GhostGuitar ML Pipeline is Ready."}

@app.post("/api/transcribe")
async def transcribe_audio(
    file: Optional[UploadFile] = File(None),
    spotify_url: Optional[str] = Form(None)
):
    """
    Primary endpoint to ingest audio and run the massive ML pipeline.
    Expects either a direct file upload or a spotify preview URL.
    """
    if not file and not spotify_url:
        raise HTTPException(status_code=400, detail="Must provide either an audio file or a spotify_url.")

    audio_path = None
    
    if file:
        audio_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(audio_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    else:
        # Use yt-dlp to grab the audio based on the text search query via SoundCloud to bypass YouTube 403s
        print(f"Downloading audio for query: '{spotify_url}'...")
        out_template = os.path.join(UPLOAD_DIR, "temp_audio.%(ext)s")
        # yt-dlp syntax to search soundcloud
        cmd = [
            "yt-dlp",
            f"scsearch1:{spotify_url}",
            "--format", "bestaudio/best",
            "--output", out_template,
            "--no-playlist"
        ]
        try:
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        except subprocess.CalledProcessError as e:
            raise HTTPException(status_code=500, detail=f"yt-dlp download failed: {e}")
            
        # Find the downloaded file
        downloaded_files = [f for f in os.listdir(UPLOAD_DIR) if f.startswith('temp_audio.')]
        if not downloaded_files:
            raise HTTPException(status_code=500, detail="Failed to locate downloaded audio file.")
            
        # Give it the actual parsed file path
        audio_path = os.path.join(UPLOAD_DIR, downloaded_files[0])

    try:
        # Run the heavy orchestration pipeline
        final_chords_sheet = await run_audio_to_chords_pipeline(audio_path)
        return {"success": True, "sheet": final_chords_sheet}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {str(e)}")
    finally:
        # Cleanup
        if audio_path and os.path.exists(audio_path):
            os.remove(audio_path)
