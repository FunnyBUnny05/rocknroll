import OpenAI from 'openai';
import { useSettingsStore } from '../store/useSettingsStore';

interface GenerationOptions {
  trackName: string;
  artist: string;
  audioAnalysisSummary: Record<string, unknown>;
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

  const { trackName, artist, audioAnalysisSummary, type, simplify, targetKey } = options;

  let systemPrompt = `You are a master guitar transcriber. Your task is to transcribe the song '${trackName}' by '${artist}'.
I am providing you with the Spotify Audio Analysis data (chroma intensity, timbre, key, mode). Use this to deduce the chords and structure.

You must output a static, printable Guitar Sheet document in JSON format.
Output valid JSON matching this schema exactly:
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
  ]
}`;

  if (type === 'chord') {
    systemPrompt += `

INSTRUCTIONS FOR CHORD SHEET ('content' field):
- Provide the lyrics for the section with the chords embedded in brackets right before the word where the change happens, exactly like this: [G] Welcome to the [D] hotel [Em] California.
- Make it highly legible for a vocalist/guitarist to read and play along.
- If a section contains no lyrics (like an Intro or Solo), just write the chord sequence like: [G]  [D]  [Em]  [C]
`;
  } else {
    systemPrompt += `

INSTRUCTIONS FOR TAB SHEET ('content' field):
- Provide a classic 6-line ASCII guitar tab for the section.
- Indicate strings (e B G D A E) on the left side.
- Space the notes out cleanly so it is easy to read.
- Capture the iconic riffs, solos, or fingerpicking patterns accurately.
- Do NOT provide lyrics for the Tab Sheet.
`;
  }

  if (simplify) {
    systemPrompt += `
CRITICAL INSTRUCTION: The user has requested to SIMPLIFY this song for beginners.
- You MUST substitute all complex, diminished, 7th, 9th, or bare chords with the easiest open chords possible (e.g., replace Bm with a simple Bm7 or transpose shapes).
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
