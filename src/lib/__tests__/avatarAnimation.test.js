import { describe, it, expect } from 'vitest';
import { pulseScale } from '../avatarAnimation';

describe('pulseScale', () => {
  it('returns 1.0 (no scale change) before the pulse starts', () => {
    expect(pulseScale(-10, 1500)).toBe(1);
  });

  it('returns 1.0 exactly at the end of the pulse duration', () => {
    expect(pulseScale(1500, 1500)).toBe(1);
  });

  it('returns 1.0 after the pulse duration has fully elapsed', () => {
    expect(pulseScale(5000, 1500)).toBe(1);
  });

  it('is greater than 1.0 partway through the pulse (the avatar visibly grows)', () => {
    const mid = pulseScale(750, 1500); // halfway
    expect(mid).toBeGreaterThan(1);
  });

  it('peaks and comes back down rather than growing monotonically', () => {
    const early = pulseScale(200, 1500);
    const peak = pulseScale(375, 1500); // quarter-way, where a sine-based pulse peaks
    const late = pulseScale(1300, 1500);
    expect(peak).toBeGreaterThan(early);
    expect(peak).toBeGreaterThan(late);
  });
});
