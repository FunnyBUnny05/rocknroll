import OpenAI from 'openai';
import { useSettingsStore } from '../store/useSettingsStore';
import type { AudioAnalysisResult } from './audioAnalysisEngine';

interface GenerationOptions {
  trackName: string;
  artist: string;
  audioAnalysisSummary: Record<string, unknown>;
  localAnalysis: AudioAnalysisResult | null;
  type: 'chord' | 'tab';
  simplify: boolean;
  targetKey?: string;
}

export async function generateGuitarInstructions(
  options: GenerationOptions
): Promise<Record<string, unknown>> {
  const { deepseekApiKey } = useSettingsStore.getState();

  if (!deepseekApiKey) {
    throw new Error('DeepSeek API key is missing. Please set it in Settings.');
  }

  const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: deepseekApiKey,
    dangerouslyAllowBrowser: true
  });

  const { trackName, artist, audioAnalysisSummary, localAnalysis, type, simplify, targetKey } = options;

  // Build the local analysis context block
  let analysisContext = '';
  if (localAnalysis) {
    const keyStr = `${localAnalysis.key.note} ${localAnalysis.key.quality}`;
    const scaleStr = localAnalysis.key.scale.join(', ');
    const timeSig = `${localAnalysis.timeSignature[0]}/${localAnalysis.timeSignature[1]}`;

    analysisContext = `
LOCAL HARMONIC ANALYSIS (from Spotify chroma vectors — use as ground truth where confidence is high):
  Detected Key: ${keyStr} (confidence: ${localAnalysis.key.confidence})
  Scale: ${scaleStr}
  Tempo: ${localAnalysis.tempo} BPM
  Time Signature: ${timeSig}
  Chords Detected: ${localAnalysis.allChordsUsed.join(', ')}

  Section-by-section chord progressions:
${localAnalysis.chordProgressions.map(p => {
  const chordSeq = p.chords.map(c => `${c.name}(${c.confidence})`).join(' → ');
  return `    ${p.sectionName}: ${chordSeq}`;
}).join('\n')}

${localAnalysis.uncertainties.length > 0 ? `  Uncertainties from local analysis:
${localAnalysis.uncertainties.map(u => `    - ${u.location}: ${u.message} [${u.candidates.join(' / ')}]`).join('\n')}` : '  No significant uncertainties detected.'}
`;
  }

  let systemPrompt = `You are a professional audio-transcription assistant acting as a master guitar transcriber.
Your single job: given analysis data for '${trackName}' by '${artist}', produce the most accurate possible guitar chords or tablature.

STRICT RULES:
1. Never guess. If something is unclear, state the uncertainty explicitly.
2. Transcription > creativity. Do not invent chords, lyrics, melodies, or riffs. All output must come from the analysis data.
3. Follow this exact workflow:
   - Use the detected key, scale, and tempo from the local analysis.
   - Identify the chord progression using root, quality, extensions, bass notes, and voicings.
   - For riffs or solos, provide true tabs: specific strings, frets, slides, bends, pull-offs, hammer-ons.
   - If multiple voicings exist, list the most playable form first.
4. Your outputs must prioritize: accuracy, repeatability, transparency of uncertainty, zero hallucination.

${analysisContext}

You must output valid JSON matching this schema exactly:
{
  "title": "${trackName}",
  "artist": "${artist}",
  "originalKey": "G",
  "bpm": 120,
  "type": "${type}",
  "chordsUsed": ["G", "C", "D", "Em"],
  "sections": [
    {
      "name": "Intro",
      "content": "..."
    },
    {
      "name": "Verse 1",
      "content": "..."
    }
  ],
  "uncertainties": [
    {
      "location": "Verse 2, bar 3",
      "message": "Chord may be Cmaj7 instead of C",
      "candidates": ["C", "Cmaj7"],
      "confidences": [0.6, 0.4]
    }
  ]
}`;

  if (type === 'chord') {
    systemPrompt += `

INSTRUCTIONS FOR CHORD SHEET ('content' field):
- Provide the lyrics for the section with the chords embedded in brackets right before the word where the change happens, exactly like this: [G] Welcome to the [D] hotel [Em] California.
- Make it highly legible for a vocalist/guitarist to read and play along.
- If a section contains no lyrics (like an Intro or Solo), just write the chord sequence like: [G]  [D]  [Em]  [C]
- Use the chord names detected by the local analysis as the primary source. Only deviate if the harmonic context clearly warrants a different chord.
`;
  } else {
    systemPrompt += `

INSTRUCTIONS FOR TAB SHEET ('content' field):
- Provide a classic 6-line ASCII guitar tab for the section.
- Indicate strings (e B G D A E) on the left side.
- Space the notes out cleanly so it is easy to read.
- Capture the iconic riffs, solos, or fingerpicking patterns accurately.
- Use standard tab notation: h = hammer-on, p = pull-off, / = slide up, \\ = slide down, b = bend, r = release.
- Do NOT provide lyrics for the Tab Sheet.
- Base the tab on the detected chord progressions and key from the local analysis.
`;
  }

  if (simplify) {
    systemPrompt += `
CRITICAL INSTRUCTION: The user has requested to SIMPLIFY this song for beginners.
- You MUST substitute all complex, diminished, 7th, 9th, or barre chords with the easiest open chords possible.
- Do your best to rely only on C, A, G, E, D, Am, Dm, Em.
`;
  }

  if (targetKey) {
    systemPrompt += `
TRANSPOSE INSTRUCTION: Outline the chords and tabs in the key of ${targetKey}. Calculate the transpositions accurately from the original key.
`;
  }

  const userMessage = `Track: ${trackName}
Artist: ${artist}
Audio Analysis: ${JSON.stringify(audioAnalysisSummary)}`;

  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    response_format: { type: 'json_object' }
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('No content returned from DeepSeek');
  }

  return JSON.parse(content);
}
