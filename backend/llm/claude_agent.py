import os
import json
from anthropic import Anthropic

def prompt_claude_transcription(ml_payload: dict, verification_feedback: dict = None) -> dict:
    """
    Sends the fully structured ML extraction data to Claude to perform
    musical analysis and output a static Guitar Sheet in JSON format.
    
    If verification_feedback is provided, challenges Claude to refine its
    transcription based on audio similarity failures.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable is not set.")
        
    client = Anthropic(api_key=api_key)
    
    system_prompt = """You are an elite musical transcription AI. I am providing you with 
high-dimensional ML-extracted data of an audio file containing:
1. Demucs-isolated harmonic stem pitch frames (Librosa pYIN)
2. Essentia HPCP Chord Candidates
3. Madmom RNN Beat and Tempo tracking

Synthesize this data to produce a hyper-accurate Guitar Sheet.
Output valid JSON matching this schema exactly:
{
  "confidence": 0.95,
  "type": "chord",
  "title": "Song Title",
  "artist": "Song Artist",
  "originalKey": "G",
  "bpm": 120,
  "chordsUsed": ["G", "C", "D", "Em"],
  "sections": [
    {
      "name": "Verse 1",
      "content": "[G] Welcome to the [D] hotel [Em] California."
    }
  ]
}

CRITICAL: You MUST include the `confidence` score (a float between 0.0 and 1.0). If you find the pitch frames and chord candidates wildly erratic or contradicting, lower your score to 0.6. If they align perfectly into a cohesive progression, score it >0.85. This dictates whether a heavier verification loop is subsequently triggered.
"""

    if verification_feedback:
        system_prompt += f"""
CRITICAL FEEDBACK LOOP: 
Your previous transcription achieved an audio similarity score of {verification_feedback['similarity_score']:.2f} (Target: >0.85).
The synthesizer failed to match the isolated harmonic stem in these specific time segments:
{json.dumps(verification_feedback['low_similarity_segments'], indent=2)}

Please revise your chords in these specific segments to better align with the pitch data.
"""

    user_content = f"Analyze the following Machine Learning Data:\n\n{json.dumps(ml_payload, indent=2)}"

    print(f"Claude Agent: Dispatching prompt (Feedback Loop: {bool(verification_feedback)})...")
    
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        temperature=0.1,
        system=system_prompt,
        messages=[
            {"role": "user", "content": user_content}
        ]
    )
    
    # Extract the JSON payload (strip markdown if necessary)
    raw_text = response.content[0].text
    if "```json" in raw_text:
        raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        
    try:
        parsed_json = json.loads(raw_text)
        return parsed_json
    except json.JSONDecodeError as e:
        print(f"Claude Agent Error: Failed to parse JSON. Raw output:\n{raw_text}")
        raise e
