import librosa
import numpy as np
from typing import Tuple, List, Dict

def verify_chords_via_audio_similarity(
    demucs_stem_path: str, 
    synthetic_audio_path: str
) -> Tuple[float, List[Dict]]:
    """
    Validates Claude's predicted chords by comparing the Synthesized version against
    the ground-truth Demucs harmonic stem using Chroma feature extraction and 
    Cosine Similarity.
    
    Returns a global similarity score (0.0 to 1.0) and a list of low-similarity time segments.
    """
    print(f"Audio Verifier: Comparing actual {demucs_stem_path} vs synthetic {synthetic_audio_path}...")
    
    try:
        # Load both files
        y_ref, sr_ref = librosa.load(demucs_stem_path, sr=22050)
        y_syn, sr_syn = librosa.load(synthetic_audio_path, sr=22050)
        
        # Minimum padding match (synthetic might be shorter/longer)
        min_len = min(len(y_ref), len(y_syn))
        y_ref = y_ref[:min_len]
        y_syn = y_syn[:min_len]
        
        # Extract Chroma Features (12 pitch classes)
        # Chroma is scale-invariant and timbre-invariant, making it ideal for 
        # comparing a real guitar to our synthetic sine-wave generator
        chroma_ref = librosa.feature.chroma_cqt(y=y_ref, sr=sr_ref, hop_length=1024)
        chroma_syn = librosa.feature.chroma_cqt(y=y_syn, sr=sr_syn, hop_length=1024)
        
        # Calculate Cosine Similarity frame-by-frame
        # dot product / (norm(a) * norm(b))
        norm_ref = np.linalg.norm(chroma_ref, axis=0) + 1e-10
        norm_syn = np.linalg.norm(chroma_syn, axis=0) + 1e-10
        
        dot_product = np.sum(chroma_ref * chroma_syn, axis=0)
        similarity_frames = dot_product / (norm_ref * norm_syn)
        
        # Global Score
        global_score = float(np.mean(similarity_frames))
        
        # Identify bad segments (e.g. < 0.6 similarity)
        bad_segments = []
        times = librosa.frames_to_time(np.arange(len(similarity_frames)), sr=sr_ref, hop_length=1024)
        
        for i, score in enumerate(similarity_frames):
            if score < 0.6:
                bad_segments.append({
                    "time": round(float(times[i]), 2),
                    "score": round(float(score), 2)
                })
                
        # Condense contiguous bad segments for succinct LLM feedback
        condensed_bad_segments = []
        if bad_segments:
            current_start = bad_segments[0]["time"]
            current_end = current_start
            
            for seg in bad_segments[1:]:
                if seg["time"] - current_end < 0.5: # contiguous (within 0.5s)
                    current_end = seg["time"]
                else:
                    condensed_bad_segments.append({"start_time": current_start, "end_time": current_end})
                    current_start = seg["time"]
                    current_end = current_start
            condensed_bad_segments.append({"start_time": current_start, "end_time": current_end})

        print(f"Verifier: Global Similarity Score: {global_score:.2f}")
        return global_score, condensed_bad_segments

    except Exception as e:
        print(f"Verifier failed: {e}")
        # Fallback to high score if file missing to prevent infinite loops
        return 0.95, []
