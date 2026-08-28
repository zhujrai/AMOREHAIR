// Web Audio API chime generator for real-time new order notifications
// Zero external assets required, instant and 100% reliable across browsers.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a pleasant, dual-tone arpeggiated chime to announce a new order
 */
export function playNewOrderSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Melody note frequencies: D5 (587.33Hz) -> F#5 (739.99Hz) -> A5 (880Hz) -> D6 (1174.66Hz)
    const notes = [
      { freq: 587.33, start: now, duration: 0.25, gain: 0.18 },
      { freq: 739.99, start: now + 0.08, duration: 0.28, gain: 0.20 },
      { freq: 880.00, start: now + 0.16, duration: 0.32, gain: 0.22 },
      { freq: 1174.66, start: now + 0.24, duration: 0.65, gain: 0.26 },
    ];

    notes.forEach(({ freq, start, duration, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Sine wave with a touch of triangle harmonic for a crystal chime tone
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      // Volume envelope: quick attack and smooth exponential decay
      gainNode.gain.setValueAtTime(0.0001, start);
      gainNode.gain.exponentialRampToValueAtTime(gain, start + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    });
  } catch (e) {
    console.warn('Could not play audio notification:', e);
  }
}
