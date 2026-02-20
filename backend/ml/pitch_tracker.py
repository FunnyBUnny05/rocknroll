import librosa
import numpy as np
from typing import List, Dict

def extract_pitch_frames(audio_path: str, sr: int = 22050) -> List[Dict[str, float]]:
    """
    Extracts pitch frames using librosa.yin (Deterministic YIN).
    Unlike pYIN, the deterministic YIN algorithm is lightning-fast and avoids
    heavy Viterbi decoding or Hidden Markov Models.
    
    Returns a list of dictionaries containing time and pitch (Hz).
    """
    print(f"Librosa FAST YIN: Extracting pitches from {audio_path}...")
    
    # Load the audio (usually the Harmonic stem from HPSS)
    y, sr = librosa.load(audio_path, sr=sr)
    
    # Estimate pitch (f0) using standard YIN.
    # Constraints keep it focused on guitar bounds to speed up search.
    f0 = librosa.yin(
        y, 
        fmin=librosa.note_to_hz('E2'), 
        fmax=librosa.note_to_hz('C6'),
        sr=sr,
        frame_length=2048
    )
    
    times = librosa.times_like(f0, sr=sr)
    
    pitch_frames = []
    
    for i in range(len(f0)):
        val = f0[i]
        # yin doesn't give a voiced flag natively like pYIN, so we filter out
        # mathematical bounds or extreme jumps via simple heuristics if needed.
        if not np.isnan(val) and val > 0:
            pitch_frames.append({
                "time": round(float(times[i]), 2),
                "pitch_hz": round(float(val), 1)
            })
            
    print(f"Librosa YIN: Extracted {len(pitch_frames)} raw pitch frames in record time.")
    return pitch_frames
