import { render } from '@testing-library/react';
import { Canvas } from '@react-three/fiber';
import { describe, it, expect, beforeEach } from 'vitest';
import Avatar from '../Avatar';
import { useProfileStore } from '../../../stores/profileStore';

describe('Avatar Component', () => {
  beforeEach(() => {
    localStorage.clear();
    useProfileStore.setState({ profiles: [], currentProfileId: null });
  });

  it('renders without crashing for a known profile', () => {
    const profile = useProfileStore.getState().addProfile({ name: 'Evan', role: 'kid', avatarColor: '#FF6B6B' });

    expect(() => {
      render(
        <Canvas>
          <Avatar profileId={profile.id} />
        </Canvas>
      );
    }).not.toThrow();
  });

  it('handles an unknown profileId gracefully (falls back to a default color)', () => {
    expect(() => {
      render(
        <Canvas>
          <Avatar profileId="does-not-exist" />
        </Canvas>
      );
    }).not.toThrow();
  });
});
