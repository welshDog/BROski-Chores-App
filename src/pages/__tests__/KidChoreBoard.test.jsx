import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import KidChoreBoard from '../KidChoreBoard';
import { useProfileStore } from '../../stores/profileStore';
import { useChoreStore } from '../../stores/choreStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderBoard() {
  return render(
    <MemoryRouter>
      <KidChoreBoard />
    </MemoryRouter>
  );
}

// KidChoreBoard renders from choreStore.instances, not templates directly.
// In the real app, App.jsx (Task 8) calls generateTodaysInstances() once on
// mount to turn today's active templates into instances before any page
// reads them. This standalone render skips that App-level bootstrap, so the
// test fixture has to call it itself — using the exact same date expression
// KidChoreBoard.jsx uses internally, so the two never disagree near a UTC
// day boundary.
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function generateInstances() {
  useChoreStore.getState().generateTodaysInstances(todayISO(), WEEKDAYS[new Date().getUTCDay()]);
}

describe('KidChoreBoard', () => {
  let evanId;

  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    useProfileStore.setState({ profiles: [], currentProfileId: null });
    useChoreStore.setState({ templates: [], instances: [] });

    const evan = useProfileStore.getState().addProfile({ name: 'Evan', role: 'kid', avatarColor: '#FF6B6B' });
    evanId = evan.id;
    useProfileStore.getState().selectProfile(evanId);

    useChoreStore.getState().addTemplate({
      title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: evanId, schedule: { type: 'daily' },
    });
    useChoreStore.getState().addTemplate({
      title: 'Water the plants', coinReward: 5, xpReward: 5, assignedTo: 'anyone', schedule: { type: 'daily' },
    });
    generateInstances();
  });

  it('redirects to / if no profile is selected', () => {
    useProfileStore.getState().clearCurrentProfile();
    renderBoard();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('shows chores assigned to the current profile and to anyone', () => {
    renderBoard();
    expect(screen.getByText('Feed the dog')).toBeInTheDocument();
    expect(screen.getByText('Water the plants')).toBeInTheDocument();
  });

  it('does not show a chore assigned to a different specific profile', () => {
    useChoreStore.getState().addTemplate({
      title: 'Only for someone else', coinReward: 1, xpReward: 1, assignedTo: 'some-other-id', schedule: { type: 'daily' },
    });
    generateInstances(); // idempotent per date — only creates the new template's instance
    renderBoard();
    expect(screen.queryByText('Only for someone else')).not.toBeInTheDocument();
  });

  it('tapping Done on an open chore moves it to a pending/waiting state', () => {
    renderBoard();
    const doneButtons = screen.getAllByRole('button', { name: /done/i });
    fireEvent.click(doneButtons[0]);

    expect(screen.getAllByText(/waiting for approval/i).length).toBeGreaterThan(0);
  });
});
