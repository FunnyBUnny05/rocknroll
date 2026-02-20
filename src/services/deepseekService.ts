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
  const { aiProvider, deepseekApiKey, claudeApiKey } = useSettingsStore.getState();

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

  let systemPrompt = `You are a deterministic music-transcription engine operating in FAST MODE.
Input: structured musical data extracted from lightweight audio analysis (HPSS, chroma, CREPE-tiny, chord candidates) for '${trackName}' by '${artist}'.

Rules:
1. Never guess. If data is insufficient, say:
   "Insufficient harmonic information."
2. Your job is to clean, correct, and finalize chord progressions and guitar tabs
   using ONLY:
   - pitch frames
   - harmonic/chroma profiles
   - candidate chords
   - detected key
   - segment boundaries
3. Use functional harmony and voice-leading logic to resolve noisy data.
4. Repeat sections automatically when chroma similarity indicates repetition.
5. Output must follow the structured JSON format below.
6. If verification_feedback is provided, refine chords to improve match with harmonic audio.
7. Do not invent melodies or chords.
8. Only valid guitar fretboard shapes. No impossible fingerings.

${analysisContext}

You must output valid JSON matching this schema exactly:
{
  "title": "${trackName}",
  "artist": "${artist}",
  "originalKey": "G",
  "bpm": 120,
  "timeSignature": "4/4",
  "type": "${type}",
  "chordsUsed": ["G", "C", "D", "Em"],
  "voicings": {
    "G": "3-2-0-0-0-3",
    "C": "x-3-2-0-1-0",
    "D": "x-x-0-2-3-2",
    "Em": "0-2-2-0-0-0"
  },
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

  if (aiProvider === 'claude') {
    return callClaude(claudeApiKey, systemPrompt, userMessage);
  }
  return callDeepSeek(deepseekApiKey, systemPrompt, userMessage);
}

/** Call DeepSeek via OpenAI-compatible SDK */
async function callDeepSeek(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
): Promise<Record<string, unknown>> {
  if (!apiKey) {
    throw new Error('DeepSeek API key is missing. Please set it in Settings.');
  }

  const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com/v1',
    apiKey,
    dangerouslyAllowBrowser: true
  });

  const MAX_RETRIES = 2;
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
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
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === MAX_RETRIES) {
        throw err;
      }
      const delay = 2000 * Math.pow(2, attempt);
      console.warn(`[DeepSeek] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, err);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError;
}

/** Call Claude via Anthropic Messages API (direct fetch) */
async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
): Promise<Record<string, unknown>> {
  if (!apiKey) {
    throw new Error('Claude API key is missing. Please set it in Settings.');
  }

  const MAX_RETRIES = 2;
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 8192,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Claude API error ${res.status}: ${body}`);
      }

      const data = await res.json();
      const textBlock = data.content?.find((b: { type: string }) => b.type === 'text');
      if (!textBlock?.text) {
        throw new Error('No text content returned from Claude');
      }

      // Extract JSON from response (Claude may wrap it in markdown code fences)
      let jsonStr = textBlock.text.trim();
      const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) {
        jsonStr = fenceMatch[1].trim();
      }

      return JSON.parse(jsonStr);
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === MAX_RETRIES) {
        throw err;
      }
      const delay = 2000 * Math.pow(2, attempt);
      console.warn(`[Claude] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, err);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError;
}

function isRetryable(err: unknown): boolean {
  return err instanceof Error && (
    err.message.includes('fetch') ||
    err.message.includes('network') ||
    err.message.includes('429') ||
    err.message.includes('500') ||
    err.message.includes('502') ||
    err.message.includes('503') ||
    err.message.includes('timeout') ||
    err.message.includes('overloaded')
  );
}
