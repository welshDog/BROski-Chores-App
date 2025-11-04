import { act } from '@testing-library/react';
import { useGameStore } from '../gameStore';
import { describe, it, expect, beforeEach } from 'vitest';

describe('Game Store', () => {
  // Helper function to get the current store state
  const getStoreState = () => useGameStore.getState();

  beforeEach(() => {
    // Reset the store to initial state before each test
    useGameStore.setState({
      coinBalance: 0,
      level: 1,
      experience: 0,
      position: { x: 0, y: 0, z: 0 },
    });
  });

  it('should have initial state', () => {
    const state = getStoreState();
    expect(state).toMatchObject({
      coinBalance: 0,
      level: 1,
      experience: 0,
      position: { x: 0, y: 0, z: 0 },
    });
  });

  it('should add coins and update experience', () => {
    act(() => {
      useGameStore.getState().addCoins(50);
    });

    const state = getStoreState();
    expect(state.coinBalance).toBe(50);
    expect(state.experience).toBe(2); // 50 / 25 = 2 XP
  });

  it('should level up when reaching 100 XP', () => {
    // Set up initial state with 90 XP
    useGameStore.setState({ experience: 90 });
    
    act(() => {
      useGameStore.getState().addCoins(250); // 250 / 25 = 10 XP
    });

    const state = getStoreState();
    expect(state.experience).toBe(0); // Should reset to 0 after level up
    expect(state.level).toBe(2); // Should increase level
  });

  it('should move avatar position', () => {
    const newPosition = { x: 1, y: 2, z: 3 };
    
    act(() => {
      useGameStore.getState().moveAvatar(newPosition);
    });

    const state = getStoreState();
    expect(state.position).toEqual(newPosition);
  });

  it('should level up', () => {
    act(() => {
      useGameStore.getState().levelUp();
    });

    const state = getStoreState();
    expect(state.level).toBe(2);
    expect(state.experience).toBe(0); // Should reset XP on level up
  });
});
