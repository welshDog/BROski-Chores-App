import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import SetupWizard from '../SetupWizard';
import { useProfileStore } from '../../stores/profileStore';
import { useChoreStore } from '../../stores/choreStore';

function goPastKids(kidName = 'Evan', hex = '#FF6B6B') {
  fireEvent.click(screen.getByRole('button', { name: /get started/i }));
  fireEvent.change(screen.getByLabelText(/kid's name/i), { target: { value: kidName } });
  fireEvent.click(screen.getByRole('button', { name: hex }));
  fireEvent.click(screen.getByRole('button', { name: /^add kid$/i }));
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
}

function goPastAdultName(adultName = 'Bro', hex = '#4A90D9') {
  fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: adultName } });
  fireEvent.click(screen.getByRole('button', { name: hex }));
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
}

function enterPin(pin) {
  for (const digit of pin) {
    fireEvent.click(screen.getByRole('button', { name: digit }));
  }
}

describe('SetupWizard', () => {
  beforeEach(() => {
    localStorage.clear();
    useProfileStore.setState({ profiles: [], currentProfileId: null });
    useChoreStore.setState({ templates: [], instances: [] });
  });

  it('adding a kid appends it to the list, and removing one removes it', () => {
    render(<SetupWizard />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    fireEvent.change(screen.getByLabelText(/kid's name/i), { target: { value: 'Evan' } });
    fireEvent.click(screen.getByRole('button', { name: '#FF6B6B' }));
    fireEvent.click(screen.getByRole('button', { name: /^add kid$/i }));

    expect(screen.getByText('Evan')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(screen.queryByText('Evan')).not.toBeInTheDocument();
  });

  it('Continue past the kids step is disabled with zero kids, enabled once one is added', () => {
    render(<SetupWizard />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));

    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/kid's name/i), { target: { value: 'Evan' } });
    fireEvent.click(screen.getByRole('button', { name: '#FF6B6B' }));
    fireEvent.click(screen.getByRole('button', { name: /^add kid$/i }));

    expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled();
  });

  it('a mismatched PIN confirmation shows an error and does not advance past the adult step', () => {
    render(<SetupWizard />);
    goPastKids();
    goPastAdultName();

    enterPin('1234');
    enterPin('9999');

    expect(screen.getByText(/didn't match/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /skip for now/i })).not.toBeInTheDocument();
  });

  it('a matching PIN confirmation advances to the chore step', () => {
    render(<SetupWizard />);
    goPastKids();
    goPastAdultName();

    enterPin('1234');
    enterPin('1234');

    expect(screen.getByRole('button', { name: /skip for now/i })).toBeInTheDocument();
  });

  it('Skip on the chore step commits both profiles but creates no template', () => {
    render(<SetupWizard />);
    goPastKids();
    goPastAdultName();
    enterPin('1234');
    enterPin('1234');

    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));

    expect(useProfileStore.getState().profiles).toHaveLength(2);
    expect(useChoreStore.getState().templates).toHaveLength(0);
  });

  it("Finish resolves a specifically-assigned draft kid to the real committed profile id, and generates today's instance", () => {
    render(<SetupWizard />);

    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    fireEvent.change(screen.getByLabelText(/kid's name/i), { target: { value: 'Evan' } });
    fireEvent.click(screen.getByRole('button', { name: '#FF6B6B' }));
    fireEvent.click(screen.getByRole('button', { name: /^add kid$/i }));
    fireEvent.change(screen.getByLabelText(/kid's name/i), { target: { value: 'Ali' } });
    fireEvent.click(screen.getByRole('button', { name: '#7ED321' }));
    fireEvent.click(screen.getByRole('button', { name: /^add kid$/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    goPastAdultName();
    enterPin('1234');
    enterPin('1234');

    const aliOptionValue = screen.getByRole('option', { name: 'Ali' }).value;
    fireEvent.change(screen.getByLabelText(/chore title/i), { target: { value: 'Feed the dog' } });
    fireEvent.change(screen.getByLabelText(/coins/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/xp/i), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/assign to/i), { target: { value: aliOptionValue } });
    fireEvent.click(screen.getByRole('button', { name: /^add chore$/i }));

    const profiles = useProfileStore.getState().profiles;
    expect(profiles).toHaveLength(3);
    const ali = profiles.find((p) => p.name === 'Ali');
    expect(ali).toBeTruthy();

    const templates = useChoreStore.getState().templates;
    expect(templates).toHaveLength(1);
    expect(templates[0].assignedTo).toBe(ali.id);
    expect(templates[0].assignedTo).not.toBe(aliOptionValue);

    const today = new Date().toISOString().slice(0, 10);
    const instances = useChoreStore.getState().instances;
    expect(instances.some((i) => i.date === today && i.templateId === templates[0].id)).toBe(true);
  });
});
