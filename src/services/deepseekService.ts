import OpenAI from 'openai';
import { useSettingsStore } from '../store/useSettingsStore';

export async function generateGuitarInstructions(
  trackName: string,
  artist: string,
  audioAnalysisSummary: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { deepseekApiKey, level } = useSettingsStore.getState();

  if (!deepseekApiKey) {
    throw new Error('DeepSeek API key is missing. Please set it in Settings.');
  }

  const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: deepseekApiKey,
    dangerouslyAllowBrowser: true
  });

  const beginnerPrompt = `You are a master transcriber. Using the provided chroma intensity for these timestamps, determine the most likely guitar chord voicing.
Cross-reference the timbre data to identify if a segment is a 'Strum' (Chords) or a 'Pluck' (Tabs). 
Anchor your deductions using the provided track key and mode.
MUST ONLY RETURN OPEN CHORDS (e.g., G, C, D, Em, Am). Replace complex barre chords with the simplest 3-string versions.
Output valid JSON matching this schema exactly:
{
  "tuning": "Standard",
  "events": [
    { "start_ms": 0, "end_ms": 500, "chord_name": "G", "tab_positions": "320003", "technique": "none" }
  ]
}
Note: 'tab_positions' must be a 6-character string representing frets from low E to high e, use 'x' for muted strings. Use '-' if a string is not played but not explicitly muted.`;

  const normalPrompt = `You are a master transcriber. Using the provided chroma intensity for these timestamps, determine the most likely guitar chord voicing.
Cross-reference the timbre data to identify if a segment is a 'Strum' (Chords) or a 'Pluck' (Tabs). 
Anchor your deductions using the provided track key and mode.
Return the exact voicings from the record. Lead notes should still be mapped within the nearest chord shape where possible, or with single notes represented like x-x-x-x-5-x.
Output valid JSON matching this schema exactly:
{
  "tuning": "Standard",
  "events": [
    { "start_ms": 0, "end_ms": 500, "chord_name": "G", "tab_positions": "320003", "technique": "none" }
  ]
}
Note: 'tab_positions' must be a 6-character string representing frets from low E to high e, use 'x' for muted strings. Use '-' if a string is not played but not explicitly muted.`;



  const systemPrompt = level === 'Beginner' ? beginnerPrompt : normalPrompt;

  const userMessage = `Track: ${trackName}\nArtist: ${artist}\nAudio Analysis: ${JSON.stringify(audioAnalysisSummary)}`;

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
