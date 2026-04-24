import { Navigate, Route, Routes } from 'react-router-dom';
import BottomNav from './components/BottomNav.jsx';
import Home from './pages/Home.jsx';
import Habit from './pages/Habit.jsx';
import Analysis from './pages/Analysis.jsx';
import Thought from './pages/Thought.jsx';
import Content from './pages/Content.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <main className="flex-1 px-4 pb-28 pt-6 sm:px-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/habit" element={<Habit />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/thought" element={<Thought />} />
          <Route path="/content" element={<Content />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
