import os
import librosa
import numpy as np
import soundfile as sf

HPSS_OUT_DIR = "hpss_output"

def isolate_guitar_stem(audio_path: str) -> str:
    """
    Runs Harmonic-Percussive Source Separation (HPSS) using Librosa.
    This is drastically faster than Demucs (seconds instead of minutes)
    and extracts a clean harmonic stem (chords/vocals) by filtering out drums.
    
    Returns the absolute path to the harmonic stem (.wav).
    """
    os.makedirs(HPSS_OUT_DIR, exist_ok=True)
    
    print(f"Librosa HPSS: Separating harmonic and percussive parts for {audio_path}...")
    
    # Load audio (mono, 22050Hz is sufficient for chord extraction)
    y, sr = librosa.load(audio_path, sr=22050)
    
    # Run fast median-filtering HPSS
    # margin > 1.0 increases isolation strength but might introduce artifacts
    y_harmonic, y_percussive = librosa.effects.hpss(y, margin=1.2)
    
    track_name = os.path.splitext(os.path.basename(audio_path))[0]
    harmonic_stem_path = os.path.join(HPSS_OUT_DIR, f"{track_name}_harmonic.wav")
    
    # Export the harmonic numpy array back to WAV so downstream modules (Essentia etc) can ingest it natively
    sf.write(harmonic_stem_path, y_harmonic, sr)
    
    print(f"Librosa HPSS: Successfully isolated harmonic stem: {harmonic_stem_path}")
    return os.path.abspath(harmonic_stem_path)

def cleanup_stems(track_name: str):
    """ Cleans up the generated harmonic wav files to save disk space. """
    path = os.path.join(HPSS_OUT_DIR, f"{track_name}_harmonic.wav")
    if os.path.exists(path):
        os.remove(path)
