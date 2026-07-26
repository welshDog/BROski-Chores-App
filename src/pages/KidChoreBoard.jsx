import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useProfileStore } from '../stores/profileStore';
import { useChoreStore } from '../stores/choreStore';
import Avatar from '../components/3D/Avatar';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function KidChoreBoard() {
  const navigate = useNavigate();
  const currentProfileId = useProfileStore((state) => state.currentProfileId);
  const profile = useProfileStore((state) => state.getProfile(currentProfileId));
  const instances = useChoreStore((state) => state.instances);
  const templates = useChoreStore((state) => state.templates);
  const markDone = useChoreStore((state) => state.markDone);

  useEffect(() => {
    if (!currentProfileId) navigate('/');
  }, [currentProfileId, navigate]);

  if (!currentProfileId || !profile) return null;

  const myChores = instances.filter(
    (i) =>
      i.date === todayISO() &&
      (i.assignedTo === currentProfileId || i.assignedTo === 'anyone') &&
      i.status !== 'approved'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <header className="mb-6 flex items-center justify-between max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-purple-700">Hey {profile.name}!</h1>
          <p className="text-gray-600">
            {profile.coins} coins · Level {profile.level}
          </p>
        </div>
        <button onClick={() => navigate('/')} className="text-sm text-gray-500 underline">
          Switch profile
        </button>
      </header>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-md p-4 h-64">
          <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <Avatar profileId={currentProfileId} />
            <OrbitControls />
          </Canvas>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Today's chores</h2>
          {myChores.length === 0 && <p className="text-gray-500">Nothing left today — nice work!</p>}
          <ul className="space-y-3">
            {myChores.map((instance) => {
              const template = templates.find((t) => t.id === instance.templateId);
              return (
                <li key={instance.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="font-medium text-gray-800">{template.title}</p>
                    <p className="text-sm text-gray-500">
                      {template.coinReward} coins · {template.xpReward} XP
                    </p>
                  </div>
                  {instance.status === 'pending' ? (
                    <span className="text-sm text-amber-600 font-medium">Waiting for approval</span>
                  ) : (
                    <button
                      onClick={() => markDone(instance.id, currentProfileId)}
                      className="bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      Done
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
