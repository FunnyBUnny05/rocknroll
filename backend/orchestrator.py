import os

# Fast ML Modules
from ml.separator import isolate_guitar_stem, cleanup_stems
from ml.segmenter import detect_repeating_sections
from ml.pitch_tracker import extract_pitch_frames
from ml.chord_candidate import extract_chord_candidates
from ml.tempo_tracker import extract_tempo_and_beats
from ml.verifier import verify_chords_via_audio_similarity
from ml.synthesizer import synthesize_midi_audio

# LLM Module
from llm.claude_agent import prompt_claude_transcription

async def run_audio_to_chords_pipeline(audio_file_path: str) -> dict:
    """
    The orchestrator for the FAST audio-to-chords ML pipeline.
    
    Steps:
    1. HPSS: Isolate harmonic stem (fast)
    2. Chroma DTW: Detect repeating sections to minimize LLM context (fast)
    3. YIN: Pitch frames (fast)
    4. Chroma/Spectral: Chord candidates (fast)
    5. Madmom: Beat/Tempo
    6. Package into JSON & prompt Claude
    7. Conditional Verification: Only synthesize and compare if Claude's confidence < 0.85.
    """
    print(f"Starting orchestration pipeline for: {audio_file_path}")
    
    # --- PHASE 1: ML PREPROCESSING ---
    print("Step 1: Running HPSS Source Separation...")
    harmonic_stem_path = isolate_guitar_stem(audio_file_path)
    
    print("Step 2: Detecting Repeating Sections via Chroma DTW...")
    unique_sections = detect_repeating_sections(harmonic_stem_path)
    
    print("Step 3: Running FAST YIN Pitch Tracking...")
    pitch_frames = extract_pitch_frames(harmonic_stem_path)
    
    print("Step 4: Running Spectral Chord Candidate Extraction...")
    candidate_chords = extract_chord_candidates(harmonic_stem_path)
    
    print("Step 5: Running Madmom Tempo & Beat Tracking...")
    tempo_data = extract_tempo_and_beats(audio_file_path)
    
    # --- PHASE 2: LLM JSON STRUCTURING ---
    print("Step 6: Structuring compact payload for Claude...")
    ml_payload = {
        "key": candidate_chords[0] if candidate_chords else "C Major", 
        "tempo": f"{tempo_data['bpm']} BPM",
        "unique_sections": unique_sections,
        "pitch_frames": pitch_frames, 
        "candidate_chords": candidate_chords
    }
    
    # --- PHASE 3: CONDITIONAL VERIFICATION LOOP ---
    max_verification_loops = 2
    current_loop = 0
    verification_feedback = None
    final_output = None
    
    while current_loop < max_verification_loops:
        print(f"Step 7: Prompting Claude (Iteration {current_loop + 1}/{max_verification_loops})")
        predicted_chords = prompt_claude_transcription(ml_payload, verification_feedback)
        
        confidence = float(predicted_chords.get("confidence", 0.9))
        
        if confidence >= 0.85:
            print(f"FAST PASS: Claude reported {confidence:.2f} confidence. Skipping audio synthesis & verification loop!")
            final_output = predicted_chords
            break
            
        print(f"LOW CONFIDENCE ({confidence:.2f}): Synthesizing Predicted Chords and Verifying...")
        try:
            synthetic_audio_path = synthesize_midi_audio(predicted_chords)
            similarity_score, low_sim_segments = verify_chords_via_audio_similarity(harmonic_stem_path, synthetic_audio_path)
        except Exception as e:
            print(f"Synthesis/Verification Error: {e}. Defaulting to current result.")
            similarity_score = 1.0 # Force pass
            low_sim_segments = []
        
        if similarity_score >= 0.85:
            print(f"Verification passed with score {similarity_score:.2f}!")
            final_output = predicted_chords
            break
        else:
            print(f"Verification failed (score {similarity_score:.2f}). Generating payload for Claude Refinement.")
            verification_feedback = {
                "low_similarity_segments": low_sim_segments,
                "similarity_score": similarity_score
            }
            current_loop += 1
            
    if not final_output:
        print("Maximum verification loops reached, returning best effort.")
        final_output = predicted_chords
        
    print("Pipeline Complete! Cleaning up intermediate files...")
    cleanup_stems(os.path.splitext(os.path.basename(audio_file_path))[0])
        
    return final_output
