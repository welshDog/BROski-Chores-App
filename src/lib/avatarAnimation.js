// Pure function: given how many ms have elapsed since a level-up fired,
// returns a scale multiplier for the avatar mesh. 1.0 = normal size.
// A half-sine bump peaking at 1.3x midway through the duration, back to
// 1.0 by the end — separated from Avatar.jsx so the animation curve is
// testable without any Three.js/DOM involved.
const PEAK_SCALE = 1.3;

export function pulseScale(elapsedMs, durationMs) {
  if (elapsedMs < 0 || elapsedMs >= durationMs) return 1;
  const progress = elapsedMs / durationMs; // 0..1
  const bump = Math.sin(progress * Math.PI); // 0 -> 1 -> 0 over the duration
  return 1 + bump * (PEAK_SCALE - 1);
}
