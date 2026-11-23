export type Cue = 'select' | 'move' | 'attack' | 'hurt' | 'turn' | 'win' | 'lose';

/** Tiny synthesized soundtrack. No audio files are downloaded. */
export class Chiptune {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private enabled = true;
  private readonly pending = new Set<number>();
  private beat = 0;
  private timer: number | null = null;
  private readonly melody = [392, 0, 440, 523, 0, 440, 392, 330, 349, 0, 392, 440, 0, 349, 330, 294];

  private readonly bass = [196, 165, 175, 147];

  get isEnabled(): boolean { return this.enabled; }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.output) this.output.gain.value = Number(this.enabled);
    if (this.enabled) {
      this.start();
    } else this.stop();
    return this.enabled;
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    for (const id of this.pending) window.clearTimeout(id);
    this.pending.clear();
  }

  start(): void {
    if (!this.enabled) return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.output = this.context.createGain();
        this.output.connect(this.context.destination);
      }
      void this.context.resume().catch(() => undefined);
      if (this.timer === null) {
        this.timer = window.setInterval(() => {
          if (!this.enabled) return;
          const beat = this.beat++ % this.melody.length;
          const note = this.melody[beat];
          if (note) this.tone(note, 0.16, 'triangle', 0.027);
          if (beat % 4 === 0) this.tone(this.bass[beat / 4], 0.34, 'triangle', 0.018);
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
      const id = window.setTimeout(() => {
        this.pending.delete(id);
        this.tone(frequency, cue === 'win' ? 0.18 : 0.09, cue === 'hurt' ? 'triangle' : 'square', 0.032);
      }, index * 85);
      this.pending.add(id);
    });
  }

  private tone(frequency: number, duration: number, type: OscillatorType, volume: number): void {
    if (!this.context || !this.output || !this.enabled || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(this.output);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
}
