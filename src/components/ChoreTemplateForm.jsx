import { useState } from 'react';
import { useProfileStore } from '../stores/profileStore';

const WEEKDAY_OPTIONS = [
  { value: 'sun', label: 'Sun' },
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
];

// Normalizes both call shapes (null for add-mode defaults, a template
// object for edit-mode) into the SAME internal shape, resolved once up
// front -- the rest of this component never branches on which mode it's
// in. A daily-type template has no `.days` array at all, so `days`
// defaults to [] in that case exactly like add mode, not undefined.
function normalize(initialValues) {
  if (!initialValues) {
    return { title: '', coinReward: '', xpReward: '', assignedTo: 'anyone', scheduleType: 'daily', days: [] };
  }
  const { title, coinReward, xpReward, assignedTo, schedule } = initialValues;
  return {
    title,
    coinReward: String(coinReward),
    xpReward: String(xpReward),
    assignedTo,
    scheduleType: schedule.type,
    days: schedule.type === 'weekdays' ? schedule.days : [],
  };
}

export default function ChoreTemplateForm({ initialValues, onSubmit, submitLabel, onCancel, idPrefix = 'chore' }) {
  const [state, setState] = useState(() => normalize(initialValues));
  const [dayError, setDayError] = useState(false);
  const kids = useProfileStore((s) => s.profiles.filter((p) => p.role === 'kid'));

  function toggleDay(day) {
    setState((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
    }));
    setDayError(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!state.title || !state.coinReward || !state.xpReward) return;
    if (state.scheduleType === 'weekdays' && state.days.length === 0) {
      setDayError(true);
      return;
    }
    onSubmit({
      title: state.title,
      coinReward: Number(state.coinReward),
      xpReward: Number(state.xpReward),
      assignedTo: state.assignedTo,
      schedule: state.scheduleType === 'daily' ? { type: 'daily' } : { type: 'weekdays', days: state.days },
    });
    setState(normalize(initialValues));
    setDayError(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor={`${idPrefix}-title`} className="block text-sm text-gray-600 mb-1">
          Chore title
        </label>
        <input
          id={`${idPrefix}-title`}
          value={state.title}
          onChange={(e) => setState((p) => ({ ...p, title: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor={`${idPrefix}-coins`} className="block text-sm text-gray-600 mb-1">
            Coins
          </label>
          <input
            id={`${idPrefix}-coins`}
            type="number"
            value={state.coinReward}
            onChange={(e) => setState((p) => ({ ...p, coinReward: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div className="flex-1">
          <label htmlFor={`${idPrefix}-xp`} className="block text-sm text-gray-600 mb-1">
            XP
          </label>
          <input
            id={`${idPrefix}-xp`}
            type="number"
            value={state.xpReward}
            onChange={(e) => setState((p) => ({ ...p, xpReward: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-assignee`} className="block text-sm text-gray-600 mb-1">
          Assign to
        </label>
        <select
          id={`${idPrefix}-assignee`}
          value={state.assignedTo}
          onChange={(e) => setState((p) => ({ ...p, assignedTo: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="anyone">Anyone</option>
          {kids.map((kid) => (
            <option key={kid.id} value={kid.id}>
              {kid.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <span className="block text-sm text-gray-600 mb-1">Schedule</span>
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setState((p) => ({ ...p, scheduleType: 'daily' }))}
            className={`px-3 py-1 rounded-lg text-sm ${state.scheduleType === 'daily' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Every day
          </button>
          <button
            type="button"
            onClick={() => setState((p) => ({ ...p, scheduleType: 'weekdays' }))}
            className={`px-3 py-1 rounded-lg text-sm ${state.scheduleType === 'weekdays' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Specific days
          </button>
        </div>
        {state.scheduleType === 'weekdays' && (
          <div>
            <div className="flex gap-1 flex-wrap">
              {WEEKDAY_OPTIONS.map((day) => (
                <label
                  key={day.value}
                  htmlFor={`${idPrefix}-day-${day.value}`}
                  className="flex items-center gap-1 text-sm bg-gray-50 border rounded-lg px-2 py-1"
                >
                  <input
                    id={`${idPrefix}-day-${day.value}`}
                    type="checkbox"
                    checked={state.days.includes(day.value)}
                    onChange={() => toggleDay(day.value)}
                  />
                  {day.label}
                </label>
              ))}
            </div>
            {dayError && <p className="text-red-600 text-sm mt-1">Pick at least one day</p>}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button type="submit" className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors">
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
