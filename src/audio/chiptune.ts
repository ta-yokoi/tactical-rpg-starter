export type Cue = 'select' | 'move' | 'attack' | 'hurt' | 'turn' | 'win' | 'lose';

/** Tiny synthesized soundtrack. No audio files are downloaded. */
export class Chiptune {
  private context: AudioContext | null = null;
  private enabled = true;
  private beat = 0;
  private timer: number | null = null;
  private readonly melody = [392, 0, 440, 523, 0, 440, 392, 330, 349, 0, 392, 440, 0, 349, 330, 294];

  get isEnabled(): boolean { return this.enabled; }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.enabled) this.start();
    return this.enabled;
  }

  start(): void {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      void this.context.resume().catch(() => undefined);
      if (this.timer === null) {
        this.timer = window.setInterval(() => {
          if (!this.enabled) return;
          const note = this.melody[this.beat++ % this.melody.length];
          if (note) this.tone(note, 0.12, 'triangle', 0.014);
        }, 270);
      }
    } catch { /* Browsers without Web Audio can still play the game. */ }
  }

  play(cue: Cue): void {
    if (!this.enabled) return;
    this.start();
    const notes: Record<Cue, number[]> = {
      select: [660], move: [392, 523], attack: [220, 440], hurt: [180, 130],
      turn: [330, 392, 523], win: [392, 523, 659, 784], lose: [330, 277, 220],
    };
    notes[cue].forEach((frequency, index) => {
      window.setTimeout(() => this.tone(frequency, cue === 'win' ? 0.18 : 0.09, 'square', 0.035), index * 85);
    });
  }

  private tone(frequency: number, duration: number, type: OscillatorType, volume: number): void {
    if (!this.context || !this.enabled || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
}
