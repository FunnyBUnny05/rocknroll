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

  const beginnerPrompt = `You are a helpful guitar teacher for absolute beginners. Convert the provided song data into ONLY easy open chords (G, C, D, Em, Am). If the song has complex barre chords, replace them with the simplest 3-string versions. Ignore fast lead parts; provide a simple 4/4 rhythm strumming pattern.
Output valid JSON matching this schema exactly:
{
  "tuning": "Standard",
  "events": [
    {
      "time": 0.0,
      "duration": 4.0,
      "type": "chord",
      "chord": {
        "name": "G Major",
        "symbol": "G",
        "placements": [{ "string": 6, "fret": 3, "finger": 2 }],
        "mutedStrings": []
      }
    }
  ],
  "lyricsAligned": [
    { "time": 0.0, "text": "lyrics line" }
  ]
}`;

  const normalPrompt = `You are a professional session guitarist transcribing a song note-for-note. Provide an extremely accurate transcription.
CRITICAL INSTRUCTIONS FOR TABS:
1. DO NOT output block chords when playing a riff, melody, or solo.
2. Output individual, sequential notes representing the lead guitar melody.
3. Each distinct note MUST be its own separate event with type: "tab".
4. Space the notes out accurately using the "time" property (e.g., 0.0, 0.5, 1.0) so they render sequentially in tablature.
5. Provide dozens of events representing the actual strumming/picking pattern, not just one per measure.

Output valid JSON matching this schema exactly:
{
  "tuning": "STANDARD (or detected)",
  "events": [
    {
      "time": 0.0,
      "duration": 0.25,
      "type": "tab",
      "notes": [ { "string": 6, "fret": 0, "duration": 0.25 } ]
    },
    {
      "time": 0.25,
      "duration": 0.25,
      "type": "tab",
      "notes": [ { "string": 5, "fret": 2, "duration": 0.25 } ]
    },
    {
      "time": 0.5,
      "duration": 0.5,
      "type": "tab",
      "notes": [ { "string": 4, "fret": 2, "duration": 0.5 } ]
    },
    {
      "time": 4.0,
      "duration": 4.0,
      "type": "chord",
      "chord": {
        "name": "E Minor",
        "symbol": "Em",
        "placements": [{ "string": 5, "fret": 2, "finger": 1 }, { "string": 4, "fret": 2, "finger": 2 }],
        "mutedStrings": []
      }
    }
  ],
  "lyricsAligned": [
    { "time": 0.0, "text": "lyrics line" }
  ]
}`;

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
