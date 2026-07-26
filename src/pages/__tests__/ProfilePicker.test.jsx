import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ProfilePicker from '../ProfilePicker';
import { useProfileStore } from '../../stores/profileStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderPicker() {
  return render(
    <MemoryRouter>
      <ProfilePicker />
    </MemoryRouter>
  );
}

describe('ProfilePicker', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    useProfileStore.setState({ profiles: [], currentProfileId: null });
    useProfileStore.getState().addProfile({ name: 'Evan', role: 'kid', avatarColor: '#FF6B6B' });
    useProfileStore.getState().addProfile({ name: 'Bro', role: 'adult', pin: '1234', avatarColor: '#4A90D9' });
  });

  it('renders a tile for every profile', () => {
    renderPicker();
    expect(screen.getByText('Evan')).toBeInTheDocument();
    expect(screen.getByText('Bro')).toBeInTheDocument();
  });

  it('tapping a kid profile selects it and navigates straight to /kid', () => {
    renderPicker();
    fireEvent.click(screen.getByText('Evan'));

    const evan = useProfileStore.getState().profiles.find((p) => p.name === 'Evan');
    expect(useProfileStore.getState().currentProfileId).toBe(evan.id);
    expect(mockNavigate).toHaveBeenCalledWith('/kid');
  });

  it('tapping an adult profile shows the PIN pad instead of navigating immediately', () => {
    renderPicker();
    fireEvent.click(screen.getByText('Bro'));

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByTestId('pin-display')).toBeInTheDocument();
  });

  it('a correct PIN selects the adult profile and navigates to /adult', () => {
    renderPicker();
    fireEvent.click(screen.getByText('Bro'));
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));

    const bro = useProfileStore.getState().profiles.find((p) => p.name === 'Bro');
    expect(useProfileStore.getState().currentProfileId).toBe(bro.id);
    expect(mockNavigate).toHaveBeenCalledWith('/adult');
  });

  it('an incorrect PIN does not navigate and does not select the profile', () => {
    renderPicker();
    fireEvent.click(screen.getByText('Bro'));
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(useProfileStore.getState().currentProfileId).toBeNull();
  });

  it('after finishing the setup wizard from an empty household, the picker shows the new profiles', () => {
    useProfileStore.setState({ profiles: [], currentProfileId: null });
    renderPicker();

    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    fireEvent.change(screen.getByLabelText(/kid's name/i), { target: { value: 'Evan' } });
    fireEvent.click(screen.getByRole('button', { name: '#FF6B6B' }));
    fireEvent.click(screen.getByRole('button', { name: /^add kid$/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Bro' } });
    fireEvent.click(screen.getByRole('button', { name: '#4A90D9' }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    for (const digit of '1234') fireEvent.click(screen.getByRole('button', { name: digit }));
    for (const digit of '1234') fireEvent.click(screen.getByRole('button', { name: digit }));

    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));

    expect(screen.getByText('Evan')).toBeInTheDocument();
    expect(screen.getByText('Bro')).toBeInTheDocument();
  });
});
