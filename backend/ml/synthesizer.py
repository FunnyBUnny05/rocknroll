import numpy as np
from scipy.io import wavfile
import librosa
import os

SYNTH_OUT_DIR = "synth_output"

def synthesize_midi_audio(predicted_chords: dict, duration_override: float = 30.0) -> str:
    """
    Synthesizes the LLM's predicted chords into an actual audio file (.wav).
    Uses mathematical sine/saw wave generation to avoid strict system 
    dependencies (like FluidSynth/SoundFonts) for cross-platform stability.
    """
    os.makedirs(SYNTH_OUT_DIR, exist_ok=True)
    out_path = os.path.join(SYNTH_OUT_DIR, "synthetic_chords.wav")
    
    print(f"Synthesizer: Rendering JSON to synthetic audio -> {out_path}")
    
    sr = 22050
    # Create an empty audio buffer (e.g. 30 seconds max for verification optimization)
    total_samples = int(duration_override * sr)
    audio_buffer = np.zeros(total_samples, dtype=np.float32)
    
    # Simple mapping of open chord roots for demonstration
    # In a full production version, this would parse the specific 
    # [G], [C] tags and map to exactly voiced MIDI arrays.
    chord_map = {
        "C": [librosa.note_to_hz('C3'), librosa.note_to_hz('E3'), librosa.note_to_hz('G3')],
        "G": [librosa.note_to_hz('G2'), librosa.note_to_hz('B2'), librosa.note_to_hz('D3')],
        "D": [librosa.note_to_hz('D3'), librosa.note_to_hz('F#3'), librosa.note_to_hz('A3')],
        "Em": [librosa.note_to_hz('E2'), librosa.note_to_hz('G2'), librosa.note_to_hz('B2')],
        "Am": [librosa.note_to_hz('A2'), librosa.note_to_hz('C3'), librosa.note_to_hz('E3')],
    }
    
    # We will simulate the chord progression by extracting chords used
    chords_used = predicted_chords.get("chordsUsed", [])
    if not chords_used:
        chords_used = ["C"] # Fallback
        
    num_chords = len(chords_used)
    samples_per_chord = total_samples // num_chords
    
    for i, chord in enumerate(chords_used):
        freqs = chord_map.get(chord, chord_map["C"])
        start_sample = i * samples_per_chord
        end_sample = start_sample + samples_per_chord
        
        t = np.linspace(0, (end_sample - start_sample) / sr, end_sample - start_sample, False)
        
        # Generate a composite wave (sine + harmonics)
        chord_wave = np.zeros_like(t)
        for f in freqs:
            chord_wave += np.sin(2 * np.pi * f * t) # Fundamental
            chord_wave += 0.5 * np.sin(2 * np.pi * (f * 2) * t) # First harmonic
            
        # Normalize
        chord_wave /= np.max(np.abs(chord_wave)) + 1e-8
        
        # Apply strict envelope to avoid clicking
        envelope = np.ones_like(chord_wave)
        fade_len = int(0.05 * sr)
        envelope[:fade_len] = np.linspace(0, 1, fade_len)
        envelope[-fade_len:] = np.linspace(1, 0, fade_len)
        
        audio_buffer[start_sample:end_sample] += (chord_wave * envelope * 0.5)

    # Export to WAV
    wavfile.write(out_path, sr, audio_buffer)
    print(f"Synthesizer: Render complete.")
    return os.path.abspath(out_path)
