import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProfilePicker from './pages/ProfilePicker';
import KidChoreBoard from './pages/KidChoreBoard';
import AdultDashboard from './pages/AdultDashboard';
import { useChoreStore } from './stores/choreStore';

const WEEKDAY_ABBREV = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export default function App() {
  const generateTodaysInstances = useChoreStore((state) => state.generateTodaysInstances);

  useEffect(() => {
    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10);
    const todayWeekday = WEEKDAY_ABBREV[today.getDay()];
    generateTodaysInstances(todayISO, todayWeekday);
  }, [generateTodaysInstances]);

  return (
    <Routes>
      <Route path="/" element={<ProfilePicker />} />
      <Route path="/kid" element={<KidChoreBoard />} />
      <Route path="/adult" element={<AdultDashboard />} />
    </Routes>
  );
}
