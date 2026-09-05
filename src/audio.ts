import type { MatchResult } from "./game/game";

// Sound effect definitions - consolidated to eliminate duplication
export const SoundEffects = {
  KEYBOARD: { frequency: 780, duration: 0.025, volume: 0.014 },
  PLAYER_WIN: [
    { frequency: 880, duration: 0.08, volume: 0.025, delay: 0 },
    { frequency: 1175, duration: 0.11, volume: 0.025, delay: 95 },
  ],
  OPPONENT_WIN: { frequency: 220, duration: 0.16, volume: 0.03 },
  DRAW: { frequency: 520, duration: 0.1, volume: 0.018 },
} as const;

let audioContext: AudioContext | null = null;
let soundEnabled = false;

/**
 * Initialize audio system with enabled state
 */
export function initAudio(enabled: boolean): void {
  soundEnabled = enabled;
}

/**
 * Set sound enabled state
 */
export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

/**
 * Play a tone at specified frequency and duration
 */
export function tone(frequency: number, duration: number, volume = 0.025): void {
  if (!soundEnabled) return;
  audioContext ??= new AudioContext();
  if (audioContext.state === "suspended") void audioContext.resume();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

/**
 * Play keyboard tick sound
 */
export function keyboardTick(): void {
  tone(SoundEffects.KEYBOARD.frequency, SoundEffects.KEYBOARD.duration, SoundEffects.KEYBOARD.volume);
}

/**
 * Play outcome beep based on match result
 */
export function outcomeBeep(outcome: MatchResult["outcome"]): void {
  if (outcome === "player") {
    SoundEffects.PLAYER_WIN.forEach((effect) => {
      window.setTimeout(() => {
        tone(effect.frequency, effect.duration, effect.volume);
      }, effect.delay);
    });
  } else if (outcome === "opponent") {
    const effect = SoundEffects.OPPONENT_WIN;
    tone(effect.frequency, effect.duration, effect.volume);
  } else {
    const effect = SoundEffects.DRAW;
    tone(effect.frequency, effect.duration, effect.volume);
  }
}
