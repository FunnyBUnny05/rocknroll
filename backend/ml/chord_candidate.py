import librosa
import numpy as np
from typing import List

def extract_chord_candidates(audio_path: str) -> List[str]:
    """
    Extracts raw chord candidates from an isolated harmonic stem using Librosa
    Chroma and a fast template-matching matrix. This avoids booting heavy 
    feature extractors like Essentia, drastically dropping latency.
    
    Returns a list of chronological chord guesses (e.g., "C", "G", "Am").
    """
    print(f"Fast Spectral Chords: Analyzing {audio_path}...")
    
    y, sr = librosa.load(audio_path, sr=22050)
    
    # Extract Chromagram (12 pitch classes)
    chromagram = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=2048)
    
    # 24 standard major and minor triads definitions over the 12 chroma bins (C to B)
    # 0=C, 1=C#, 2=D, 3=D#, 4=E, 5=F, 6=F#, 7=G, 8=G#, 9=A, 10=A#, 11=B
    chord_templates = []
    chord_labels = []
    
    notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    
    for i in range(12):
        # Major Triad (Root, Major 3rd, Perfect 5th)
        maj_template = np.zeros(12)
        maj_template[i] = 1.0          # Root
        maj_template[(i + 4) % 12] = 1.0 # M3
        maj_template[(i + 7) % 12] = 1.0 # P5
        chord_templates.append(maj_template)
        chord_labels.append(notes[i])
        
        # Minor Triad (Root, Minor 3rd, Perfect 5th)
        min_template = np.zeros(12)
        min_template[i] = 1.0          # Root
        min_template[(i + 3) % 12] = 1.0 # m3
        min_template[(i + 7) % 12] = 1.0 # P5
        chord_templates.append(min_template)
        chord_labels.append(notes[i] + 'm')
        
    templates_matrix = np.array(chord_templates).T # Shape (12, 24)
    
    # Correlate the chromagram against the 24 chord templates
    # This is a highly-optimized dot product across the entire song matrix instantly
    chord_scores = np.dot(templates_matrix.T, chromagram)
    
    # Get the best matching chord index for each frame
    best_chord_indices = np.argmax(chord_scores, axis=0)
    
    condensed_chords = []
    last_chord = None
    
    # We apply median filtering over the indexes to smooth out rapid jitter
    # (e.g., quick passing notes misinterpreted as chord changes)
    import scipy.signal
    smoothed_indices = scipy.signal.medfilt(best_chord_indices, kernel_size=5)
    
    for idx in smoothed_indices:
        chord = chord_labels[int(idx)]
        if chord != last_chord:
            condensed_chords.append(chord)
            last_chord = chord
            
    print(f"Fast Spectral: Extracted {len(condensed_chords)} distinct chord changes.")
    return condensed_chords
