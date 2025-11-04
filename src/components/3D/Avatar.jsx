import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useGameStore } from '../../stores/gameStore';

export default function Avatar() {
  const avatarRef = useRef();
  const { position } = useGameStore();

  useFrame(() => {
    // Animate avatar movement
    if (avatarRef.current) {
      // Simple animation - in a real app, you'd use GSAP or similar
      avatarRef.current.position.x = position * 0.5; // Adjust multiplier as needed
    }
  });

  return (
    <group ref={avatarRef}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.8, 1, 0.4]} />
        <meshStandardMaterial color="#FF6B6B" />
      </mesh>
    </group>
  );
}
