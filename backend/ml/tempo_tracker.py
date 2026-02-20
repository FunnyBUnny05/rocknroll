import librosa
import numpy as np
from typing import Dict, List

def extract_tempo_and_beats(audio_path: str) -> Dict:
    """
    Extracts the BPM and precise beat timestamps from an audio file using 
    Librosa's dynamic programming beat tracker. Extremely fast and lightweight.
    
    Returns a dictionary with 'bpm' (int) and 'beats' (list of float timestamps).
    """
    print(f"Librosa Beat Tracker: Analyzing {audio_path}...")
    
    try:
        y, sr = librosa.load(audio_path, sr=22050)
        
        # Run beat tracker
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        
        # Convert tempo from a 1D array to a scalar float, then to int
        if isinstance(tempo, np.ndarray):
            bpm = int(round(float(tempo[0])))
        else:
            bpm = int(round(float(tempo)))
            
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)
        
        # Format output
        rounded_beats = [round(float(b), 2) for b in beat_times]
        
        print(f"Librosa Beat Tracker: Detected {bpm} BPM with {len(rounded_beats)} beats.")
        
        return {
            "bpm": bpm,
            "beats": rounded_beats
        }
        
    except Exception as e:
        print(f"Error extracting tempo with Librosa: {e}")
        return {"bpm": 120, "beats": []}
