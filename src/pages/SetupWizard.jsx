import { useState } from 'react';
import { useProfileStore } from '../stores/profileStore';
import { useChoreStore } from '../stores/choreStore';
import AvatarColorSwatches from '../components/AvatarColorSwatches';
import PinPad from '../components/PinPad';
import ChoreTemplateForm from '../components/ChoreTemplateForm';

const WEEKDAY_ABBREV = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export default function SetupWizard() {
  const addProfile = useProfileStore((s) => s.addProfile);
  const addTemplate = useChoreStore((s) => s.addTemplate);
  const generateTodaysInstances = useChoreStore((s) => s.generateTodaysInstances);

  const [step, setStep] = useState('welcome');

  const [draftKids, setDraftKids] = useState([]);
  const [kidName, setKidName] = useState('');
  const [kidColor, setKidColor] = useState('');

  const [adultName, setAdultName] = useState('');
  const [adultColor, setAdultColor] = useState('');
  const [pendingPin, setPendingPin] = useState(null);
  const [confirmedPin, setConfirmedPin] = useState(null);
  const [pinError, setPinError] = useState(false);

  function addDraftKid() {
    if (!kidName.trim() || !kidColor) return;
    setDraftKids((prev) => [...prev, { draftId: crypto.randomUUID(), name: kidName.trim(), avatarColor: kidColor }]);
    setKidName('');
    setKidColor('');
  }

  function removeDraftKid(draftId) {
    setDraftKids((prev) => prev.filter((k) => k.draftId !== draftId));
  }

  function continueFromAdultName() {
    if (!adultName.trim() || !adultColor) return;
    setStep('adult-pin');
  }

  function handleSetPin(pin) {
    setPendingPin(pin);
    setPinError(false);
    setStep('adult-pin-confirm');
  }

  // On mismatch we deliberately stay on this same step with pendingPin
  // untouched -- only the confirm attempt is retried, per the spec's
  // "reset just the confirm step" rule. PinPad already clears its own
  // entered digits after every 4-digit submit, so it's ready to go again.
  function handleConfirmPin(pin) {
    if (pin === pendingPin) {
      setConfirmedPin(pin);
      setPinError(false);
      setStep('chore');
    } else {
      setPinError(true);
    }
  }

  // Single commit point: nothing touches profileStore/choreStore before
  // this runs. Kids are committed before the adult, and the adult before
  // the (optional) chore, so a kid-specific chore assignment can resolve
  // through a real profile id, never a draft-local one.
  function handleFinish(chorePatch) {
    if (!confirmedPin) return;

    const idMap = {};
    draftKids.forEach((kid) => {
      const created = addProfile({ name: kid.name, role: 'kid', avatarColor: kid.avatarColor });
      idMap[kid.draftId] = created.id;
    });

    addProfile({ name: adultName.trim(), role: 'adult', pin: confirmedPin, avatarColor: adultColor });

    if (chorePatch) {
      const resolvedAssignedTo = chorePatch.assignedTo === 'anyone' ? 'anyone' : idMap[chorePatch.assignedTo];
      addTemplate({ ...chorePatch, assignedTo: resolvedAssignedTo });
      const today = new Date();
      generateTodaysInstances(today.toISOString().slice(0, 10), WEEKDAY_ABBREV[today.getDay()]);
    }
  }

  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-blue-50 to-purple-50 p-6 text-center">
        <h1 className="text-4xl font-bold text-purple-700">Let's set up your household</h1>
        <p className="text-gray-600 max-w-md">
          We'll add who's doing chores, one adult with a PIN to approve them, and -- if you want -- your first chore.
        </p>
        <button
          onClick={() => setStep('kids')}
          className="bg-purple-600 text-white px-6 py-3 rounded-xl text-lg hover:bg-purple-700 transition-colors"
        >
          Get started
        </button>
      </div>
    );
  }

  if (step === 'kids') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <h2 className="text-2xl font-bold text-purple-700">Add the kids</h2>
        <div className="w-full max-w-sm space-y-3 bg-white rounded-xl shadow-md p-6">
          <div>
            <label htmlFor="wizard-kid-name" className="block text-sm text-gray-600 mb-1">
              Kid's name
            </label>
            <input
              id="wizard-kid-name"
              value={kidName}
              onChange={(e) => setKidName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <AvatarColorSwatches value={kidColor} onChange={setKidColor} />
          <button
            onClick={addDraftKid}
            disabled={!kidName.trim() || !kidColor}
            className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add kid
          </button>
        </div>

        {draftKids.length > 0 && (
          <ul className="w-full max-w-sm space-y-2">
            {draftKids.map((kid) => (
              <li key={kid.draftId} className="flex items-center justify-between bg-white rounded-lg shadow-sm px-4 py-2">
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full" style={{ backgroundColor: kid.avatarColor }} />
                  {kid.name}
                </span>
                <button onClick={() => removeDraftKid(kid.draftId)} className="text-sm text-red-600 underline">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={() => setStep('adult-name')}
          disabled={draftKids.length === 0}
          className="bg-purple-600 text-white px-6 py-3 rounded-xl text-lg hover:bg-purple-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    );
  }

  if (step === 'adult-name') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <h2 className="text-2xl font-bold text-purple-700">Add an adult</h2>
        <div className="w-full max-w-sm space-y-3 bg-white rounded-xl shadow-md p-6">
          <div>
            <label htmlFor="wizard-adult-name" className="block text-sm text-gray-600 mb-1">
              Your name
            </label>
            <input
              id="wizard-adult-name"
              value={adultName}
              onChange={(e) => setAdultName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <AvatarColorSwatches value={adultColor} onChange={setAdultColor} />
        </div>
        <button
          onClick={continueFromAdultName}
          disabled={!adultName.trim() || !adultColor}
          className="bg-purple-600 text-white px-6 py-3 rounded-xl text-lg hover:bg-purple-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    );
  }

  if (step === 'adult-pin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Set a PIN</h2>
        <p className="text-gray-600 text-sm">This unlocks the adult dashboard to approve chores.</p>
        <PinPad onSubmit={handleSetPin} />
      </div>
    );
  }

  if (step === 'adult-pin-confirm') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Confirm PIN</h2>
        {pinError && <p className="text-red-600 text-sm">PINs didn't match, try again.</p>}
        <PinPad onSubmit={handleConfirmPin} />
        <button
          onClick={() => {
            setPendingPin(null);
            setPinError(false);
            setStep('adult-pin');
          }}
          className="text-sm text-gray-500 underline"
        >
          Set a different PIN
        </button>
      </div>
    );
  }

  if (step === 'chore') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <h2 className="text-2xl font-bold text-purple-700">Add your first chore?</h2>
      <div className="w-full max-w-sm bg-white rounded-xl shadow-md p-6">
        <ChoreTemplateForm
          initialValues={null}
          onSubmit={handleFinish}
          submitLabel="Add chore"
          idPrefix="wizard-chore"
          kidsOverride={draftKids.map((kid) => ({ id: kid.draftId, name: kid.name }))}
        />
      </div>
      <button onClick={() => handleFinish(null)} className="text-sm text-gray-500 underline">
        Skip for now
      </button>
    </div>
  );

  return null;
}
