/**
 * Audio Engine - Real audio playback using Tone.js / Web Audio API.
 *
 * Provides sample-accurate timing by reading from the Web Audio clock
 * instead of relying on requestAnimationFrame timestamps. The engine
 * exposes a singleton that the PlaybackControls and store sync against.
 */

import * as Tone from 'tone';

export interface AudioEngineState {
  isLoaded: boolean;
  duration: number;
  isPlaying: boolean;
}

class AudioEngine {
  private player: Tone.Player | null = null;
  private _duration = 0;
  private _isLoaded = false;
  private _objectUrl: string | null = null;

  /** Load an audio file from a URL or File/Blob */
  async load(source: string | File): Promise<number> {
    // Dispose previous player
    this.dispose();

    await Tone.start();

    let url: string;
    if (source instanceof File) {
      this._objectUrl = URL.createObjectURL(source);
      url = this._objectUrl;
    } else {
      url = source;
    }

    this.player = new Tone.Player({
      url,
      onload: () => {
        this._isLoaded = true;
      },
    }).toDestination();

    // Wait for the buffer to load
    await Tone.loaded();

    this._duration = this.player.buffer.duration;
    this._isLoaded = true;
    return this._duration;
  }

  /** Start playback from the given offset (seconds) at the given rate */
  play(offset = 0, rate = 1): void {
    if (!this.player || !this._isLoaded) return;

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
   * This is the high-precision clock source that drives Ghost Hand sync.
   */
  get contextTime(): number {
    return Tone.now();
  }

  get duration(): number {
    return this._duration;
  }

  get isLoaded(): boolean {
    return this._isLoaded;
  }

  get isPlaying(): boolean {
    return this.player?.state === 'started';
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
