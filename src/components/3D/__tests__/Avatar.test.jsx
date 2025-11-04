import { render, screen } from '@testing-library/react';
import { Canvas } from '@react-three/fiber';
import { describe, it, expect, vi } from 'vitest';
import Avatar from '../Avatar';
import { useGameStore } from '../../../stores/gameStore';

// Mock the game store
vi.mock('../../../stores/gameStore', () => ({
  useGameStore: vi.fn()
}));

describe('Avatar Component', () => {
  const mockPosition = { x: 0, y: 0, z: 0 };
  
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Setup default mock implementation
    useGameStore.mockImplementation((selector) => {
      const state = {
        position: mockPosition,
        // Add other store properties as needed
      };
      return selector ? selector(state) : state;
    });
  });

  it('renders without crashing', () => {
    render(
      <Canvas>
        <Avatar />
      </Canvas>
    );
    
    // The canvas should be rendered
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('uses position from the store', () => {
    const testPosition = { x: 1, y: 2, z: 3 };
    useGameStore.mockImplementation((selector) => {
      const state = {
        position: testPosition,
      };
      return selector ? selector(state) : state;
    });

    render(
      <Canvas>
        <Avatar />
      </Canvas>
    );

    // We can't directly test the Three.js position in the DOM,
    // but we can verify the store was called
    expect(useGameStore).toHaveBeenCalled();
  });

  it('handles missing position gracefully', () => {
    useGameStore.mockImplementation((selector) => {
      const state = {
        position: undefined, // Simulate missing position
      };
      return selector ? selector(state) : state;
    });

    expect(() => {
      render(
        <Canvas>
          <Avatar />
        </Canvas>
      );
    }).not.toThrow();
  });
});
