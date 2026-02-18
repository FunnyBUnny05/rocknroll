# GhostGuitar

AI-powered guitar learning app with 3D "Ghost Hand" visualization for finger placement.

## Features

- **Ghost Hand Engine** - Semi-transparent 3D hand visualization using React Three Fiber that shows actual finger positioning on the fretboard, not just dots
- **AI Transcription** - Pipeline to convert any audio file into synchronized chord/tab data (Basic Pitch + Demucs architecture)
- **Dual Mode** - Toggle between Beginner (chord shapes, slow tempo) and Professional (full technical tabs, original speed)
- **Chord & Tab Views** - Switch between chord diagram overlays and standard tablature notation
- **Playback Sync** - High-performance state management ensuring the Ghost Hand moves perfectly with audio

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| 3D Engine | Three.js via React Three Fiber + Drei |
| Styling | Tailwind CSS v4 |
| State | Zustand (high-frequency playback sync) |
| Audio | Tone.js (Web Audio API) |
| Build | Vite |
| AI Pipeline | Basic Pitch (ONNX) + Demucs (server-side) |

## Project Structure

```
src/
├── components/
│   ├── fretboard/     # 3D fretboard + GhostFretboard wrapper
│   ├── hand/          # Ghost Hand 3D visualization
│   ├── player/        # Playback transport controls
│   └── ui/            # Chord/Tab overlay components
├── engine/            # Fretboard geometry calculations
├── services/          # AI transcription pipeline
├── store/             # Zustand state management
└── types/             # TypeScript types + Song JSON schema
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to see the app.

## Song Data Schema

Songs are stored as structured JSON with:
- Audio source reference
- Timed chord/tab events with hand-pose keyframes
- Separate beginner and professional tracks
- Metadata (BPM, tuning, capo, time signature)

See `src/types/song.ts` for the full TypeScript interface and JSON Schema.

## AI Transcription Pipeline

The recommended architecture for audio-to-tab conversion:

1. **Source Separation** - Demucs (Meta) isolates the guitar track from a full mix
2. **Pitch Detection** - Basic Pitch (Spotify) converts audio to MIDI with per-note confidence
3. **Tab Mapping** - MIDI notes mapped to optimal guitar string/fret positions
4. **Hand Pose Generation** - Finger assignments and wrist angles computed for natural positioning
5. **Difficulty Simplification** - Beginner track generated with chord grouping and tempo reduction

## Development

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

## License

MIT
