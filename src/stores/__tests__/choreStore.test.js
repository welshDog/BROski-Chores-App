import { describe, it, expect, beforeEach } from 'vitest';
import { useChoreStore } from '../choreStore';

describe('choreStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useChoreStore.setState({ templates: [], instances: [] });
  });

  it('addTemplate creates an active daily template', () => {
    const template = useChoreStore.getState().addTemplate({
      title: 'Feed the dog',
      coinReward: 10,
      xpReward: 5,
      assignedTo: 'anyone',
      schedule: { type: 'daily' },
    });

    expect(template.id).toBeTruthy();
    expect(template.title).toBe('Feed the dog');
    expect(template.active).toBe(true);
    expect(useChoreStore.getState().templates).toHaveLength(1);
  });

  it('updateTemplate patches fields on an existing template', () => {
    const template = useChoreStore.getState().addTemplate({
      title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: 'anyone', schedule: { type: 'daily' },
    });
    useChoreStore.getState().updateTemplate(template.id, { coinReward: 15 });

    expect(useChoreStore.getState().templates[0].coinReward).toBe(15);
    expect(useChoreStore.getState().templates[0].title).toBe('Feed the dog'); // untouched fields survive
  });

  it('deactivateTemplate sets active to false without removing it', () => {
    const template = useChoreStore.getState().addTemplate({
      title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: 'anyone', schedule: { type: 'daily' },
    });
    useChoreStore.getState().deactivateTemplate(template.id);

    expect(useChoreStore.getState().templates).toHaveLength(1);
    expect(useChoreStore.getState().templates[0].active).toBe(false);
  });

  it('generateTodaysInstances creates one instance per active daily template', () => {
    useChoreStore.getState().addTemplate({
      title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: 'anyone', schedule: { type: 'daily' },
    });
    useChoreStore.getState().generateTodaysInstances('2026-07-26', 'sun');

    const instances = useChoreStore.getState().instancesForDate('2026-07-26');
    expect(instances).toHaveLength(1);
    expect(instances[0].status).toBe('open');
    expect(instances[0].completedBy).toBeNull();
  });

  it('generateTodaysInstances only creates weekday-scheduled instances on a matching weekday', () => {
    useChoreStore.getState().addTemplate({
      title: 'Take out bins', coinReward: 5, xpReward: 5, assignedTo: 'anyone',
      schedule: { type: 'weekdays', days: ['mon', 'thu'] },
    });

    useChoreStore.getState().generateTodaysInstances('2026-07-26', 'sun'); // a Sunday
    expect(useChoreStore.getState().instancesForDate('2026-07-26')).toHaveLength(0);

    useChoreStore.getState().generateTodaysInstances('2026-07-27', 'mon'); // a Monday
    expect(useChoreStore.getState().instancesForDate('2026-07-27')).toHaveLength(1);
  });

  it('generateTodaysInstances skips inactive templates', () => {
    const template = useChoreStore.getState().addTemplate({
      title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: 'anyone', schedule: { type: 'daily' },
    });
    useChoreStore.getState().deactivateTemplate(template.id);
    useChoreStore.getState().generateTodaysInstances('2026-07-26', 'sun');

    expect(useChoreStore.getState().instancesForDate('2026-07-26')).toHaveLength(0);
  });

  it('generateTodaysInstances is idempotent for the same date', () => {
    useChoreStore.getState().addTemplate({
      title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: 'anyone', schedule: { type: 'daily' },
    });
    useChoreStore.getState().generateTodaysInstances('2026-07-26', 'sun');
    useChoreStore.getState().generateTodaysInstances('2026-07-26', 'sun'); // called again, e.g. app remounted

    expect(useChoreStore.getState().instancesForDate('2026-07-26')).toHaveLength(1);
  });

  it('markDone moves an instance from open to pending and records who did it', () => {
    useChoreStore.getState().addTemplate({
      title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: 'anyone', schedule: { type: 'daily' },
    });
    useChoreStore.getState().generateTodaysInstances('2026-07-26', 'sun');
    const instance = useChoreStore.getState().instancesForDate('2026-07-26')[0];

    useChoreStore.getState().markDone(instance.id, 'evan-id');

    const updated = useChoreStore.getState().instances.find((i) => i.id === instance.id);
    expect(updated.status).toBe('pending');
    expect(updated.completedBy).toBe('evan-id');
  });

  it('approve returns the reward info and moves the instance to approved', () => {
    const template = useChoreStore.getState().addTemplate({
      title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: 'anyone', schedule: { type: 'daily' },
    });
    useChoreStore.getState().generateTodaysInstances('2026-07-26', 'sun');
    const instance = useChoreStore.getState().instancesForDate('2026-07-26')[0];
    useChoreStore.getState().markDone(instance.id, 'evan-id');

    const result = useChoreStore.getState().approve(instance.id);

    expect(result).toEqual({ profileId: 'evan-id', coinReward: 10, xpReward: 5 });
    expect(useChoreStore.getState().instances.find((i) => i.id === instance.id).status).toBe('approved');
  });

  it('approve returns null for an instance that is not pending', () => {
    useChoreStore.getState().addTemplate({
      title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: 'anyone', schedule: { type: 'daily' },
    });
    useChoreStore.getState().generateTodaysInstances('2026-07-26', 'sun');
    const instance = useChoreStore.getState().instancesForDate('2026-07-26')[0]; // still 'open', never markDone'd

    expect(useChoreStore.getState().approve(instance.id)).toBeNull();
  });

  it('decline returns a pending instance to open and clears completedBy, without deleting it', () => {
    useChoreStore.getState().addTemplate({
      title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: 'anyone', schedule: { type: 'daily' },
    });
    useChoreStore.getState().generateTodaysInstances('2026-07-26', 'sun');
    const instance = useChoreStore.getState().instancesForDate('2026-07-26')[0];
    useChoreStore.getState().markDone(instance.id, 'evan-id');

    useChoreStore.getState().decline(instance.id);

    const updated = useChoreStore.getState().instances.find((i) => i.id === instance.id);
    expect(updated.status).toBe('open');
    expect(updated.completedBy).toBeNull();
    expect(useChoreStore.getState().instances).toHaveLength(1); // not deleted
  });
});
