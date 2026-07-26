import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../stores/profileStore';
import { useChoreStore } from '../stores/choreStore';
import ChoreTemplateForm from '../components/ChoreTemplateForm';

const WEEKDAY_ABBREV = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export default function AdultDashboard() {
  const navigate = useNavigate();
  const currentProfileId = useProfileStore((state) => state.currentProfileId);
  const profiles = useProfileStore((state) => state.profiles);
  const addReward = useProfileStore((state) => state.addReward);
  const clearCurrentProfile = useProfileStore((state) => state.clearCurrentProfile);

  const templates = useChoreStore((state) => state.templates);
  const instances = useChoreStore((state) => state.instances);
  const addTemplate = useChoreStore((state) => state.addTemplate);
  const updateTemplate = useChoreStore((state) => state.updateTemplate);
  const deactivateTemplate = useChoreStore((state) => state.deactivateTemplate);
  const approve = useChoreStore((state) => state.approve);
  const decline = useChoreStore((state) => state.decline);
  const generateTodaysInstances = useChoreStore((state) => state.generateTodaysInstances);

  const [editingTemplateId, setEditingTemplateId] = useState(null);

  const currentProfile = profiles.find((p) => p.id === currentProfileId);

  useEffect(() => {
    if (currentProfile?.role !== 'adult') navigate('/', { replace: true });
  }, [currentProfile, navigate]);

  if (currentProfile?.role !== 'adult') return null;

  const pending = instances.filter((i) => i.status === 'pending');

  function nameFor(profileId) {
    return profiles.find((p) => p.id === profileId)?.name ?? 'Someone';
  }

  // Every template mutation re-runs this. generateTodaysInstances already
  // dedupes per template+date, so this is a harmless no-op after a
  // deactivate, and correctly produces today's instance immediately after
  // a reactivate (or an edit that newly makes a template apply today).
  function regenerateToday() {
    const today = new Date();
    generateTodaysInstances(today.toISOString().slice(0, 10), WEEKDAY_ABBREV[today.getDay()]);
  }

  function handleApprove(instanceId) {
    const result = approve(instanceId);
    if (result) addReward(result.profileId, { coins: result.coinReward, xp: result.xpReward });
  }

  function handleAddTemplate(patch) {
    addTemplate(patch);
    regenerateToday();
  }

  function handleUpdateTemplate(patch) {
    updateTemplate(editingTemplateId, patch);
    regenerateToday();
    setEditingTemplateId(null);
  }

  function handleDeactivate(id) {
    deactivateTemplate(id);
    regenerateToday();
  }

  function handleReactivate(id) {
    updateTemplate(id, { active: true });
    regenerateToday();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <header className="mb-6 flex items-center justify-between max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-purple-700">Adult dashboard</h1>
        <button
          onClick={() => {
            clearCurrentProfile();
            navigate('/', { replace: true });
          }}
          className="text-sm text-gray-500 underline"
        >
          Switch profile
        </button>
      </header>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Waiting for approval</h2>
          {pending.length === 0 && <p className="text-gray-500">Nothing to approve right now.</p>}
          <ul className="space-y-3">
            {pending.map((instance) => {
              const template = templates.find((t) => t.id === instance.templateId);
              return (
                <li key={instance.id} className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium text-gray-800">{template.title}</p>
                  <p className="text-sm text-gray-500 mb-3">
                    by {nameFor(instance.completedBy)} · {instance.coinReward ?? template.coinReward} coins ·{' '}
                    {instance.xpReward ?? template.xpReward} XP
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(instance.id)}
                      className="bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => decline(instance.id)}
                      className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Chores</h2>
          <div data-testid="chore-add-form" className="mb-6">
            <ChoreTemplateForm
              initialValues={null}
              onSubmit={handleAddTemplate}
              submitLabel="Add chore"
              idPrefix="chore-add"
            />
          </div>

          <ul className="space-y-2">
            {templates.map((template) => {
              if (editingTemplateId === template.id) {
                return (
                  <li key={template.id} data-testid="chore-edit-form" className="border-b py-3">
                    <ChoreTemplateForm
                      initialValues={template}
                      onSubmit={handleUpdateTemplate}
                      submitLabel="Save"
                      onCancel={() => setEditingTemplateId(null)}
                      idPrefix="chore-edit"
                    />
                  </li>
                );
              }

              return (
                <li
                  key={template.id}
                  className={`flex items-center justify-between border-b py-2 ${template.active ? '' : 'opacity-50'}`}
                >
                  <div className="text-sm text-gray-700">
                    <span>{template.title}</span>
                    <span className="text-gray-500 ml-2">
                      {template.coinReward}c · {template.xpReward}xp
                    </span>
                    {!template.active && <span className="ml-2 text-xs text-gray-400">(Inactive)</span>}
                  </div>
                  <div className="flex gap-2">
                    {template.active ? (
                      <>
                        <button onClick={() => setEditingTemplateId(template.id)} className="text-sm text-blue-600 underline">
                          Edit
                        </button>
                        <button onClick={() => handleDeactivate(template.id)} className="text-sm text-red-600 underline">
                          Deactivate
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleReactivate(template.id)} className="text-sm text-green-600 underline">
                        Reactivate
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
