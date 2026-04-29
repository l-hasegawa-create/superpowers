import { NavLink } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  BookOpen,
  Headphones,
  Home as HomeIcon,
  Settings as SettingsIcon,
} from 'lucide-react';

const TABS = [
  { to: '/', label: 'ホーム', icon: HomeIcon },
  { to: '/habit', label: '習慣', icon: Activity },
  { to: '/analysis', label: '分析', icon: BarChart3 },
  { to: '/thought', label: '思考', icon: BookOpen },
  { to: '/content', label: '番組', icon: Headphones },
  { to: '/settings', label: '設定', icon: SettingsIcon },
];

export default function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-app-border bg-app-bg/90 backdrop-blur-md"
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-6">
        {TABS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center justify-center gap-1 py-3 transition-colors',
                  isActive
                    ? 'text-app-amber'
                    : 'text-app-dim hover:text-app-text-soft',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                  <span className="text-[11px] font-medium">{label}</span>
                  <span
                    aria-hidden
                    className={[
                      'h-0.5 w-6 rounded-full transition-all',
                      isActive ? 'bg-app-amber' : 'bg-transparent',
                    ].join(' ')}
                  />
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
