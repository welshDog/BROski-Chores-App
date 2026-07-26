import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../stores/profileStore';
import PinPad from '../components/PinPad';

export default function ProfilePicker() {
  const navigate = useNavigate();
  const profiles = useProfileStore((state) => state.profiles);
  const selectProfile = useProfileStore((state) => state.selectProfile);
  const verifyPin = useProfileStore((state) => state.verifyPin);
  const [pinTargetId, setPinTargetId] = useState(null);
  const [pinError, setPinError] = useState(false);

  function pickProfile(profile) {
    if (profile.role === 'kid') {
      selectProfile(profile.id);
      navigate('/kid');
    } else {
      setPinError(false);
      setPinTargetId(profile.id);
    }
  }

  function submitPin(pin) {
    if (verifyPin(pinTargetId, pin)) {
      selectProfile(pinTargetId);
      navigate('/adult');
    } else {
      setPinError(true);
    }
  }

  if (pinTargetId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Enter PIN</h2>
        {pinError && <p className="text-red-600 text-sm">Wrong PIN, try again.</p>}
        <PinPad onSubmit={submitPin} />
        <button
          onClick={() => setPinTargetId(null)}
          className="text-sm text-gray-500 underline"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-purple-700 mb-2">BROski</h1>
        <p className="text-gray-600">Who's doing chores?</p>
      </header>
      <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-3 gap-6">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => pickProfile(profile)}
            className="flex flex-col items-center gap-3 bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div
              className="w-20 h-20 rounded-full"
              style={{ backgroundColor: profile.avatarColor }}
            />
            <span className="text-lg font-semibold text-gray-800">{profile.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
