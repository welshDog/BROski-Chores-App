import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ChoreTemplateForm from '../ChoreTemplateForm';
import { useProfileStore } from '../../stores/profileStore';

describe('ChoreTemplateForm', () => {
  let evanId;

  beforeEach(() => {
    localStorage.clear();
    useProfileStore.setState({ profiles: [], currentProfileId: null });
    const evan = useProfileStore.getState().addProfile({ name: 'Evan', role: 'kid', avatarColor: '#FF6B6B' });
    evanId = evan.id;
    useProfileStore.getState().addProfile({ name: 'Bro', role: 'adult', pin: '1234', avatarColor: '#4A90D9' });
  });

  it('add mode (initialValues null) starts with empty fields, "anyone" assignee, and daily schedule', () => {
    render(<ChoreTemplateForm initialValues={null} onSubmit={() => {}} submitLabel="Add chore" />);

    expect(screen.getByLabelText(/chore title/i).value).toBe('');
    expect(screen.getByLabelText(/assign to/i).value).toBe('anyone');
    expect(screen.getByRole('button', { name: /every day/i })).toHaveClass('bg-purple-600');
    expect(screen.queryByRole('checkbox', { name: 'Mon' })).not.toBeInTheDocument();
  });

  it('edit mode normalizes a daily template into the same internal shape as add mode, pre-filled', () => {
    render(
      <ChoreTemplateForm
        initialValues={{ title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: evanId, schedule: { type: 'daily' } }}
        onSubmit={() => {}}
        submitLabel="Save"
      />
    );

    expect(screen.getByLabelText(/chore title/i).value).toBe('Feed the dog');
    expect(screen.getByLabelText(/coins/i).value).toBe('10');
    expect(screen.getByLabelText(/xp/i).value).toBe('5');
    expect(screen.getByLabelText(/assign to/i).value).toBe(evanId);
    expect(screen.queryByRole('checkbox', { name: 'Mon' })).not.toBeInTheDocument();
  });

  it("edit mode normalizes a weekdays template's days correctly", () => {
    render(
      <ChoreTemplateForm
        initialValues={{ title: 'Take out bins', coinReward: 5, xpReward: 5, assignedTo: 'anyone', schedule: { type: 'weekdays', days: ['mon', 'thu'] } }}
        onSubmit={() => {}}
        submitLabel="Save"
      />
    );

    expect(screen.getByRole('button', { name: /specific days/i })).toHaveClass('bg-purple-600');
    expect(screen.getByRole('checkbox', { name: 'Mon' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Thu' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Wed' })).not.toBeChecked();
  });

  it('assignee options are exactly the kid profiles plus Anyone -- no adults', () => {
    render(<ChoreTemplateForm initialValues={null} onSubmit={() => {}} submitLabel="Add chore" />);

    expect(screen.getByRole('option', { name: 'Anyone' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Evan' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Bro' })).not.toBeInTheDocument();
  });

  it('submits the correct patch shape for a daily schedule', () => {
    const onSubmit = vi.fn();
    render(<ChoreTemplateForm initialValues={null} onSubmit={onSubmit} submitLabel="Add chore" />);

    fireEvent.change(screen.getByLabelText(/chore title/i), { target: { value: 'Feed the dog' } });
    fireEvent.change(screen.getByLabelText(/coins/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/xp/i), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /add chore/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Feed the dog',
      coinReward: 10,
      xpReward: 5,
      assignedTo: 'anyone',
      schedule: { type: 'daily' },
    });
  });

  it('submits the correct patch shape for a specific-weekdays schedule with a chosen assignee', () => {
    const onSubmit = vi.fn();
    render(<ChoreTemplateForm initialValues={null} onSubmit={onSubmit} submitLabel="Add chore" />);

    fireEvent.change(screen.getByLabelText(/chore title/i), { target: { value: 'Take out bins' } });
    fireEvent.change(screen.getByLabelText(/coins/i), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/xp/i), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText(/assign to/i), { target: { value: evanId } });
    fireEvent.click(screen.getByRole('button', { name: /specific days/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mon' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Thu' }));
    fireEvent.click(screen.getByRole('button', { name: /add chore/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Take out bins',
      coinReward: 8,
      xpReward: 4,
      assignedTo: evanId,
      schedule: { type: 'weekdays', days: ['mon', 'thu'] },
    });
  });

  it('blocks submit and shows a hint when Specific days is selected with zero days checked', () => {
    const onSubmit = vi.fn();
    render(<ChoreTemplateForm initialValues={null} onSubmit={onSubmit} submitLabel="Add chore" />);

    fireEvent.change(screen.getByLabelText(/chore title/i), { target: { value: 'Take out bins' } });
    fireEvent.change(screen.getByLabelText(/coins/i), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/xp/i), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: /specific days/i }));
    fireEvent.click(screen.getByRole('button', { name: /add chore/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/pick at least one day/i)).toBeInTheDocument();
  });

  it('clears the hint the moment a day is checked', () => {
    render(<ChoreTemplateForm initialValues={null} onSubmit={() => {}} submitLabel="Add chore" />);

    fireEvent.change(screen.getByLabelText(/chore title/i), { target: { value: 'Take out bins' } });
    fireEvent.change(screen.getByLabelText(/coins/i), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/xp/i), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: /specific days/i }));
    fireEvent.click(screen.getByRole('button', { name: /add chore/i }));
    expect(screen.getByText(/pick at least one day/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Mon' }));
    expect(screen.queryByText(/pick at least one day/i)).not.toBeInTheDocument();
  });

  it('resets to blank defaults after a successful add-mode submit', () => {
    render(<ChoreTemplateForm initialValues={null} onSubmit={() => {}} submitLabel="Add chore" />);

    fireEvent.change(screen.getByLabelText(/chore title/i), { target: { value: 'Feed the dog' } });
    fireEvent.change(screen.getByLabelText(/coins/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/xp/i), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /add chore/i }));

    expect(screen.getByLabelText(/chore title/i).value).toBe('');
  });

  it('renders input ids derived from idPrefix, so two forms on screen at once never collide', () => {
    render(<ChoreTemplateForm initialValues={null} onSubmit={() => {}} submitLabel="Add chore" idPrefix="chore-add" />);
    expect(document.getElementById('chore-add-title')).toBeInTheDocument();
  });

  it('renders a Cancel button only when onCancel is provided', () => {
    const { rerender } = render(<ChoreTemplateForm initialValues={null} onSubmit={() => {}} submitLabel="Add chore" />);
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();

    rerender(<ChoreTemplateForm initialValues={null} onSubmit={() => {}} submitLabel="Save" onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});
