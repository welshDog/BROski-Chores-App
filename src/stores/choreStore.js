import { create } from 'zustand';
import { persist } from 'zustand/middleware';

function templateAppliesToday(template, todayWeekday) {
  if (!template.active) return false;
  if (template.schedule.type === 'daily') return true;
  return template.schedule.days.includes(todayWeekday);
}

export const useChoreStore = create(
  persist(
    (set, get) => ({
      templates: [],
      instances: [],

      addTemplate: ({ title, coinReward, xpReward, assignedTo, schedule }) => {
        const template = {
          id: crypto.randomUUID(),
          title,
          coinReward,
          xpReward,
          assignedTo,
          schedule,
          active: true,
        };
        set((state) => ({ templates: [...state.templates, template] }));
        return template;
      },

      updateTemplate: (id, patch) => {
        set((state) => ({
          templates: state.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }));
      },

      deactivateTemplate: (id) => {
        set((state) => ({
          templates: state.templates.map((t) => (t.id === id ? { ...t, active: false } : t)),
        }));
      },

      // Idempotent per date: only generates an instance for a template
      // that doesn't already have one for that date, so calling this on
      // every app mount is safe even if today's instances already exist.
      generateTodaysInstances: (todayISO, todayWeekday) => {
        const { templates, instances } = get();
        const existingTemplateIds = new Set(
          instances.filter((i) => i.date === todayISO).map((i) => i.templateId)
        );

        const newInstances = templates
          .filter((t) => templateAppliesToday(t, todayWeekday) && !existingTemplateIds.has(t.id))
          .map((t) => ({
            id: crypto.randomUUID(),
            templateId: t.id,
            date: todayISO,
            assignedTo: t.assignedTo,
            completedBy: null,
            status: 'open',
          }));

        if (newInstances.length > 0) {
          set((state) => ({ instances: [...state.instances, ...newInstances] }));
        }
      },

      instancesForDate: (dateISO) => get().instances.filter((i) => i.date === dateISO),

      markDone: (instanceId, byProfileId) => {
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId ? { ...i, status: 'pending', completedBy: byProfileId } : i
          ),
        }));
      },

      // Returns the reward to credit (the caller is responsible for
      // actually crediting it via profileStore.addReward — this store
      // never imports profileStore, keeping the two decoupled) or null
      // if the instance isn't in a state that can be approved.
      approve: (instanceId) => {
        const instance = get().instances.find((i) => i.id === instanceId);
        if (!instance || instance.status !== 'pending') return null;

        const template = get().templates.find((t) => t.id === instance.templateId);
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId ? { ...i, status: 'approved' } : i
          ),
        }));

        return { profileId: instance.completedBy, coinReward: template.coinReward, xpReward: template.xpReward };
      },

      decline: (instanceId) => {
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId ? { ...i, status: 'open', completedBy: null } : i
          ),
        }));
      },
    }),
    { name: 'broski_chores_chores_v1' }
  )
);
