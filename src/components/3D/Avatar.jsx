import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { useProfileStore } from '../../stores/profileStore';
import { pulseScale } from '../../lib/avatarAnimation';

const LEVEL_UP_DURATION_MS = 1500;

export default function Avatar({ profileId }) {
  const avatarRef = useRef();
  const avatarColor = useProfileStore((state) => state.getProfile(profileId)?.avatarColor ?? '#FF6B6B');
  const justLeveledUp = useProfileStore((state) => state.getProfile(profileId)?.justLeveledUp ?? false);
  const clearLevelUpFlag = useProfileStore((state) => state.clearLevelUpFlag);
  const [elapsed, setElapsed] = useState(0);

  useFrame((_, delta) => {
    if (!avatarRef.current) return;

    if (justLeveledUp) {
      const nextElapsed = elapsed + delta * 1000;
      const scale = pulseScale(nextElapsed, LEVEL_UP_DURATION_MS);
      avatarRef.current.scale.setScalar(scale);
      if (nextElapsed >= LEVEL_UP_DURATION_MS) {
        setElapsed(0);
        clearLevelUpFlag(profileId);
      } else {
        setElapsed(nextElapsed);
      }
    } else {
      avatarRef.current.scale.setScalar(1);
    }
  });

  return (
    <group ref={avatarRef}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.8, 1, 0.4]} />
        <meshStandardMaterial color={avatarColor} />
      </mesh>
    </group>
  );
}
