/**
 * Audio Engine - Real audio playback using Tone.js / Web Audio API.
 *
 * Provides sample-accurate timing by reading from the Web Audio clock
 * instead of relying on requestAnimationFrame timestamps. The engine
 * exposes a singleton that the PlaybackControls and store sync against.
 *
 * Tone.js is loaded lazily to avoid crashing the page on import
 * (it probes AudioContext at module scope in some builds).
 */

export interface AudioEngineState {
  isLoaded: boolean;
  duration: number;
  isPlaying: boolean;
}

// Lazy-loaded Tone module reference
let Tone: typeof import('tone') | null = null;

async function getTone() {
  if (!Tone) {
    Tone = await import('tone');
  }
  return Tone;
}

class AudioEngine {
  private player: import('tone').Player | null = null;
  private _duration = 0;
  private _isLoaded = false;
  private _objectUrl: string | null = null;
  /** Fallback clock using performance.now() when Tone isn't loaded yet */
  private _fallbackClockStart = performance.now() / 1000;

  /** Load an audio file from a URL or File/Blob */
  async load(source: string | File): Promise<number> {
    this.dispose();

    const T = await getTone();
    await T.start();

    let url: string;
    if (source instanceof File) {
      this._objectUrl = URL.createObjectURL(source);
      url = this._objectUrl;
    } else {
      url = source;
    }

    this.player = new T.Player({
      url,
      onload: () => {
        this._isLoaded = true;
      },
    }).toDestination();

    await T.loaded();

    this._duration = this.player.buffer.duration;
    this._isLoaded = true;
    return this._duration;
  }

  /** Start playback from the given offset (seconds) at the given rate */
  play(offset = 0, rate = 1): void {
    if (!this.player || !this._isLoaded || !Tone) return;

    this.player.playbackRate = rate;

    if (this.player.state === 'started') {
      this.player.stop();
    }

    this.player.start(Tone.now(), offset);
  }

  /** Pause (stop) playback */
  pause(): void {
    if (!this.player) return;
    if (this.player.state === 'started') {
      this.player.stop();
    }
  }

  /** Stop and reset */
  stop(): void {
    this.pause();
  }

  /** Set playback rate (0.25 - 2.0) */
  setRate(rate: number): void {
    if (this.player) {
      this.player.playbackRate = rate;
    }
  }

  /**
   * Get current transport time from Web Audio context.
   * Falls back to performance.now() if Tone isn't loaded yet.
   */
  get contextTime(): number {
    if (Tone) return Tone.now();
    return performance.now() / 1000 - this._fallbackClockStart;
  }

  get duration(): number {
    return this._duration;
  }

  get isLoaded(): boolean {
    return this._isLoaded;
  }

  get isPlaying(): boolean {
    return this.player?.state === 'started' || false;
  }

  /** Clean up resources */
  dispose(): void {
    if (this.player) {
      this.player.stop();
      this.player.dispose();
      this.player = null;
    }
    if (this._objectUrl) {
      URL.revokeObjectURL(this._objectUrl);
      this._objectUrl = null;
    }
    this._isLoaded = false;
    this._duration = 0;
  }
}

/** Singleton audio engine instance */
export const audioEngine = new AudioEngine();
