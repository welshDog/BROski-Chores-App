import { useGameStore } from './stores/gameStore';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Avatar from './components/3D/Avatar';

export default function App() {
  const { coinBalance, level, experience } = useGameStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-purple-700 mb-2">BROski </h1>
        <p className="text-gray-600">Chores made fun with gamification!</p>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Board */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6 h-[500px]">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Game Board</h2>
          <div className="h-[400px] bg-gray-100 rounded-lg">
            <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} />
              <Avatar />
              <OrbitControls />
            </Canvas>
          </div>
        </div>

        {/* Player Stats */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Player Stats</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Coins</p>
                <p className="text-2xl font-bold text-yellow-500"> {coinBalance}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Level {level}</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${(experience / 100) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-right text-gray-500">{experience}/100 XP</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors">
                Add Chore
              </button>
              <button className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors">
                View Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
