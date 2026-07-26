import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../stores/profileStore';
import { useChoreStore } from '../stores/choreStore';

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
  const approve = useChoreStore((state) => state.approve);
  const decline = useChoreStore((state) => state.decline);
  const generateTodaysInstances = useChoreStore((state) => state.generateTodaysInstances);

  const [title, setTitle] = useState('');
  const [coinReward, setCoinReward] = useState('');
  const [xpReward, setXpReward] = useState('');

  useEffect(() => {
    if (!currentProfileId) navigate('/');
  }, [currentProfileId, navigate]);

  if (!currentProfileId) return null;

  const pending = instances.filter((i) => i.status === 'pending');

  function nameFor(profileId) {
    return profiles.find((p) => p.id === profileId)?.name ?? 'Someone';
  }

  function handleApprove(instanceId) {
    const result = approve(instanceId);
    if (result) addReward(result.profileId, { coins: result.coinReward, xp: result.xpReward });
  }

  function handleAddTemplate(e) {
    e.preventDefault();
    if (!title || !coinReward || !xpReward) return;
    addTemplate({
      title,
      coinReward: Number(coinReward),
      xpReward: Number(xpReward),
      assignedTo: 'anyone',
      schedule: { type: 'daily' },
    });
    const today = new Date();
    generateTodaysInstances(today.toISOString().slice(0, 10), WEEKDAY_ABBREV[today.getDay()]);
    setTitle('');
    setCoinReward('');
    setXpReward('');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <header className="mb-6 flex items-center justify-between max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-purple-700">Adult dashboard</h1>
        <button
          onClick={() => {
            clearCurrentProfile();
            navigate('/');
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
                    by {nameFor(instance.completedBy)} · {template.coinReward} coins · {template.xpReward} XP
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
          <form onSubmit={handleAddTemplate} className="space-y-3 mb-6">
            <div>
              <label htmlFor="chore-title" className="block text-sm text-gray-600 mb-1">
                Chore title
              </label>
              <input
                id="chore-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="chore-coins" className="block text-sm text-gray-600 mb-1">
                  Coins
                </label>
                <input
                  id="chore-coins"
                  type="number"
                  value={coinReward}
                  onChange={(e) => setCoinReward(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="chore-xp" className="block text-sm text-gray-600 mb-1">
                  XP
                </label>
                <input
                  id="chore-xp"
                  type="number"
                  value={xpReward}
                  onChange={(e) => setXpReward(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <button
              type="submit"
              className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors"
            >
              Add chore
            </button>
          </form>

          <ul className="space-y-2">
            {templates.filter((t) => t.active).map((template) => (
              <li key={template.id} className="text-sm text-gray-700 flex justify-between border-b py-2">
                <span>{template.title}</span>
                <span className="text-gray-500">
                  {template.coinReward}c · {template.xpReward}xp
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
