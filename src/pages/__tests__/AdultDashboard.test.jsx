import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AdultDashboard from '../AdultDashboard';
import { useProfileStore } from '../../stores/profileStore';
import { useChoreStore } from '../../stores/choreStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderDashboard() {
  return render(
    <MemoryRouter>
      <AdultDashboard />
    </MemoryRouter>
  );
}

describe('AdultDashboard', () => {
  let evanId, broId;

  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    useProfileStore.setState({ profiles: [], currentProfileId: null });
    useChoreStore.setState({ templates: [], instances: [] });

    const evan = useProfileStore.getState().addProfile({ name: 'Evan', role: 'kid', avatarColor: '#FF6B6B' });
    evanId = evan.id;
    const bro = useProfileStore.getState().addProfile({ name: 'Bro', role: 'adult', pin: '1234', avatarColor: '#4A90D9' });
    broId = bro.id;
    useProfileStore.getState().selectProfile(broId);

    const template = useChoreStore.getState().addTemplate({
      title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: evanId, schedule: { type: 'daily' },
    });
    useChoreStore.getState().generateTodaysInstances(new Date().toISOString().slice(0, 10), 'sun');
    const instance = useChoreStore.getState().instancesForDate(new Date().toISOString().slice(0, 10))[0];
    useChoreStore.getState().markDone(instance.id, evanId);
  });

  it('redirects to / if no profile is selected', () => {
    useProfileStore.getState().clearCurrentProfile();
    renderDashboard();
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('redirects to / if the selected profile is a kid, not an adult', () => {
    useProfileStore.getState().selectProfile(evanId); // evanId is the kid from beforeEach, has no pin
    renderDashboard();
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('shows pending chores in the approval queue', () => {
    renderDashboard();
    const queue = screen.getByRole('heading', { name: /waiting for approval/i }).closest('div');
    expect(within(queue).getByText('Feed the dog')).toBeInTheDocument();
    expect(within(queue).getByText(/evan/i)).toBeInTheDocument();
  });

  it('approving a pending chore credits the completing profile and removes it from the queue', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));
    const queue = screen.getByRole('heading', { name: /waiting for approval/i }).closest('div');

    expect(useProfileStore.getState().getProfile(evanId).coins).toBe(10);
    expect(useProfileStore.getState().getProfile(evanId).xp).toBe(5);
    expect(within(queue).queryByText('Feed the dog')).not.toBeInTheDocument();
  });

  it('declining a pending chore returns it to open without crediting anything', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /decline/i }));

    expect(useProfileStore.getState().getProfile(evanId).coins).toBe(0);
    const todaysInstances = useChoreStore.getState().instancesForDate(new Date().toISOString().slice(0, 10));
    expect(todaysInstances[0].status).toBe('open');
  });

  it('adding a new chore template shows it in the template list', () => {
    renderDashboard();
    fireEvent.change(screen.getByLabelText(/chore title/i), { target: { value: 'Take out bins' } });
    fireEvent.change(screen.getByLabelText(/coins/i), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/xp/i), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: /add chore/i }));

    expect(useChoreStore.getState().templates.some((t) => t.title === 'Take out bins')).toBe(true);
    expect(screen.getByText('Take out bins')).toBeInTheDocument();
  });

  it('a newly added chore template immediately generates today\'s instance, visible without reload', () => {
    renderDashboard();
    fireEvent.change(screen.getByLabelText(/chore title/i), { target: { value: 'Take out bins' } });
    fireEvent.change(screen.getByLabelText(/coins/i), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/xp/i), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: /add chore/i }));

    const today = new Date().toISOString().slice(0, 10);
    const newTemplate = useChoreStore.getState().templates.find((t) => t.title === 'Take out bins');
    const instances = useChoreStore.getState().instancesForDate(today);
    expect(instances.some((i) => i.templateId === newTemplate.id)).toBe(true);
  });

  it('deactivating a template shows it greyed out with a Reactivate option, still in the list', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /deactivate/i }));

    const choresPanel = screen.getByRole('heading', { name: /^chores$/i }).closest('div');
    expect(within(choresPanel).getByText('Feed the dog')).toBeInTheDocument();
    expect(screen.getByText(/inactive/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reactivate/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^deactivate$/i })).not.toBeInTheDocument();
    const template = useChoreStore.getState().templates.find((t) => t.title === 'Feed the dog');
    expect(template.active).toBe(false);
  });

  it("reactivating a template restores it to active and doesn't duplicate today's instance", () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /deactivate/i }));
    fireEvent.click(screen.getByRole('button', { name: /reactivate/i }));

    const template = useChoreStore.getState().templates.find((t) => t.title === 'Feed the dog');
    expect(template.active).toBe(true);

    const today = new Date().toISOString().slice(0, 10);
    const todaysInstancesForTemplate = useChoreStore
      .getState()
      .instancesForDate(today)
      .filter((i) => i.templateId === template.id);
    expect(todaysInstancesForTemplate).toHaveLength(1);
  });

  it('editing a template shows the edit form pre-filled with its current values', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));

    const editForm = within(screen.getByTestId('chore-edit-form'));
    expect(editForm.getByLabelText(/chore title/i).value).toBe('Feed the dog');
    expect(editForm.getByLabelText(/coins/i).value).toBe('10');
    expect(editForm.getByLabelText(/xp/i).value).toBe('5');
  });

  it('saving an edit updates the template, regenerates instances, and closes the editor', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));

    const editForm = within(screen.getByTestId('chore-edit-form'));
    fireEvent.change(editForm.getByLabelText(/chore title/i), { target: { value: 'Feed the dog daily' } });
    fireEvent.click(editForm.getByRole('button', { name: /^save$/i }));

    expect(useChoreStore.getState().templates.some((t) => t.title === 'Feed the dog daily')).toBe(true);
    expect(screen.queryByTestId('chore-edit-form')).not.toBeInTheDocument();
  });

  it('cancelling an edit discards changes and does not call updateTemplate', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));

    const editForm = within(screen.getByTestId('chore-edit-form'));
    fireEvent.change(editForm.getByLabelText(/chore title/i), { target: { value: 'Should not save' } });
    fireEvent.click(editForm.getByRole('button', { name: /cancel/i }));

    expect(useChoreStore.getState().templates.some((t) => t.title === 'Should not save')).toBe(false);
    expect(useChoreStore.getState().templates.some((t) => t.title === 'Feed the dog')).toBe(true);
    expect(screen.queryByTestId('chore-edit-form')).not.toBeInTheDocument();
  });
});
