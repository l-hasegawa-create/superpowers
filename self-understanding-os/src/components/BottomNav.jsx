import { NavLink } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  BrainCircuit,
  Home as HomeIcon,
  Layers,
  Settings as SettingsIcon,
} from 'lucide-react';

const TABS = [
  { to: '/', label: 'HOME', icon: HomeIcon },
  { to: '/habit', label: 'HABIT', icon: Activity },
  { to: '/analysis', label: 'ANALYSIS', icon: BarChart3 },
  { to: '/thought', label: 'THOUGHT', icon: BrainCircuit },
  { to: '/content', label: 'CONTENT', icon: Layers },
  { to: '/settings', label: 'SETTINGS', icon: SettingsIcon },
];

export default function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-jarvis-border bg-jarvis-bg/85 backdrop-blur-md"
    >
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-jarvis-cyan to-transparent opacity-70" />
      <ul className="mx-auto grid max-w-3xl grid-cols-6">
        {TABS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'group flex flex-col items-center justify-center gap-1 py-3 transition-colors',
                  isActive
                    ? 'text-jarvis-accent'
                    : 'text-jarvis-dim hover:text-jarvis-cyan',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    strokeWidth={1.75}
                    className={
                      isActive
                        ? 'animate-pulse-glow drop-shadow-[0_0_6px_rgba(0,229,255,0.7)]'
                        : 'transition-[filter] group-hover:drop-shadow-[0_0_4px_rgba(0,229,255,0.5)]'
                    }
                  />
                  <span className="font-display text-[9px] font-semibold tracking-[0.08em] sm:text-[10px] sm:tracking-[0.18em]">
                    {label}
                  </span>
                  <span
                    aria-hidden
                    className={[
                      'h-0.5 w-5 rounded-full transition-all sm:w-6',
                      isActive
                        ? 'bg-jarvis-cyan shadow-glow'
                        : 'bg-transparent',
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
