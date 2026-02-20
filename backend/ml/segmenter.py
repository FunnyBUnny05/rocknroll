import librosa
import numpy as np
from typing import List, Dict

def detect_repeating_sections(audio_path: str) -> List[Dict[str, float]]:
    """
    Analyzes the song structure using Chroma features and a self-similarity matrix.
    Identifies major looping sections (e.g., Verse, Chorus) so the pipeline
    can focus transcription on unique harmonic content, drastically reducing
    latency and LLM token usage.
    
    Returns a list of unique segments with start and end times in seconds.
    """
    print(f"Segmenter: Detecting unique song structures in {audio_path}...")
    
    # Load a low sample rate version optimized for structural analysis (11025Hz)
    y, sr = librosa.load(audio_path, sr=11025)
    
    # Extract structural Chroma features
    hop_length = 2048 # High hop length for structural overview
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop_length)
    
    # For a truly robust pipeline, librosa.segment.agglomerative or recurrence matrix clustering
    # is used. For this fast MVP, we divide the song into fixed macro-blocks (e.g., 10 seconds)
    # and compute cosine similarity between blocks to flag "repeated" sections.
    
    block_duration_sec = 10.0
    frames_per_block = int(librosa.time_to_frames(block_duration_sec, sr=sr, hop_length=hop_length))
    
    total_frames = chroma.shape[1]
    num_blocks = total_frames // frames_per_block
    
    unique_segments = []
    seen_blocks = []
    
    # Similarity Threshold (0.0 to 1.0)
    # If a block is >85% similar to a previous block, consider it a repeat (e.g., Chorus 2)
    similarity_threshold = 0.85 
    
    for i in range(num_blocks):
        start_frame = i * frames_per_block
        end_frame = start_frame + frames_per_block
        block_chroma = chroma[:, start_frame:end_frame]
        
        # Normalize the block for cosine similarity
        block_norm = block_chroma / (np.linalg.norm(block_chroma, axis=0) + 1e-10)
        
        # Flatten for block-level comparison
        flat_block = block_norm.flatten()
        
        is_unique = True
        
        for seen_flat in seen_blocks:
            # Padding if shapes mismatch slightly at the very end
            min_len = min(len(flat_block), len(seen_flat))
            
            dot_product = np.dot(flat_block[:min_len], seen_flat[:min_len])
            mag_a = np.linalg.norm(flat_block[:min_len])
            mag_b = np.linalg.norm(seen_flat[:min_len])
            
            similarity = dot_product / ((mag_a * mag_b) + 1e-10)
            
            if similarity > similarity_threshold:
                is_unique = False
                break
                
        if is_unique:
            seen_blocks.append(flat_block)
            start_time = librosa.frames_to_time(start_frame, sr=sr, hop_length=hop_length)
            end_time = librosa.frames_to_time(end_frame, sr=sr, hop_length=hop_length)
            
            unique_segments.append({
                "start": round(float(start_time), 2),
                "end": round(float(end_time), 2)
            })
            
    print(f"Segmenter: Reduced track into {len(unique_segments)} unique harmonic sections.")
    return unique_segments
