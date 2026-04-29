import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import BottomNav from './components/BottomNav.jsx';
import StartupFlow from './components/StartupFlow.jsx';
import ThoughtQuickAdd, {
  FloatingThoughtButton,
} from './components/ThoughtQuickAdd.jsx';
import Home from './pages/Home.jsx';
import Habit from './pages/Habit.jsx';
import Analysis from './pages/Analysis.jsx';
import Thought from './pages/Thought.jsx';
import Content from './pages/Content.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  const [thoughtOpen, setThoughtOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function bumpRefresh() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <main className="flex-1 px-4 pb-28 pt-6 sm:px-6">
        <Routes>
          <Route path="/" element={<Home key={refreshKey} />} />
          <Route path="/habit" element={<Habit />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/thought" element={<Thought key={refreshKey} />} />
          <Route path="/content" element={<Content />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <FloatingThoughtButton onClick={() => setThoughtOpen(true)} />
      <ThoughtQuickAdd
        open={thoughtOpen}
        onClose={() => setThoughtOpen(false)}
        onSaved={bumpRefresh}
      />

      <StartupFlow onComplete={bumpRefresh} />

      <BottomNav />
    </div>
  );
}
