import { NavLink } from 'react-router-dom';
import { Activity, BarChart3, FileText, ClipboardList, Terminal, FileSearch, Shield, Settings, LogOut, Home, HelpCircle } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useEffectiveSession } from '../hooks/useEffectiveSession';
import redHatLogo from '../assets/red_hat_logo.svg';

const navItems = [
  { to: '/analysis', icon: Activity, label: 'Live Analysis' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/rca-summary', icon: FileText, label: 'RCA Summary' },
  { to: '/rca-report', icon: ClipboardList, label: 'RCA Detailed' },
  { to: '/logging-tracing', icon: FileSearch, label: 'Logging / Tracing' },
  { to: '/console', icon: Terminal, label: 'Raw Console' },
];

interface SidebarProps {
  agentReady: boolean;
}

export default function Sidebar({ agentReady }: SidebarProps) {
  const { user, isAdmin, logout } = useUser();
  const { sessionSuffix } = useEffectiveSession();
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const handleLogout = () => {
    logout();
  };

  return (
    <aside
      className="fixed left-0 top-8 bottom-0 w-56 bg-sidebar-bg flex flex-col z-50 border-r border-zinc-800"
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="px-4 py-5 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <img
            src={redHatLogo}
            alt="Red Hat"
            className="w-8 h-8 object-contain flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="text-white font-bold text-sm leading-tight tracking-wide">
              IntelliAide
            </div>
            <div className="text-zinc-400 text-[10px] leading-tight mt-0.5 tracking-wider uppercase">
              AI-Powered RCA
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <span className="block h-px flex-1 bg-brand-red opacity-60" />
          <span className="text-[9px] text-zinc-500 tracking-widest uppercase font-medium">Red Hat</span>
          <span className="block h-px flex-1 bg-brand-red opacity-60" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 mt-3 space-y-0.5 overflow-y-auto">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 ${
              isActive
                ? 'bg-brand-red text-white shadow-sm'
                : 'text-zinc-400 hover:bg-sidebar-hover hover:text-white'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Home className="w-4 h-4 flex-shrink-0" />
              <span>Dashboard</span>
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 block" />}
            </>
          )}
        </NavLink>

        {/* Admin section — top level, separate from RCA session nav */}
        {isAdmin && (
          <div className="mt-2 pt-2 border-t border-zinc-800 space-y-0.5">
            <div className="px-3 pt-1 pb-1.5">
              <span className="text-[9px] text-yellow-600/70 tracking-widest uppercase font-semibold">Admin</span>
            </div>
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-yellow-600 text-white shadow-sm'
                    : 'text-yellow-500/80 hover:bg-sidebar-hover hover:text-yellow-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  <span>Admin Dashboard</span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 block" />}
                </>
              )}
            </NavLink>
            <NavLink
              to="/admin/setup"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-yellow-600 text-white shadow-sm'
                    : 'text-yellow-500/80 hover:bg-sidebar-hover hover:text-yellow-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Settings className="w-4 h-4 flex-shrink-0" />
                  <span>Setup</span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 block" />}
                </>
              )}
            </NavLink>
          </div>
        )}

        {/* RCA session nav */}
        <div className={`space-y-0.5 ${isAdmin ? 'mt-2 pt-2 border-t border-zinc-800' : ''}`}>
          {isAdmin && (
            <div className="px-3 pt-1 pb-1.5">
              <span className="text-[9px] text-zinc-500 tracking-widest uppercase font-semibold">RCA Session</span>
            </div>
          )}
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={`${to}${sessionSuffix}`}
              end={to === '/analysis'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-red text-white shadow-sm'
                    : 'text-zinc-400 hover:bg-sidebar-hover hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 block" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="mt-2 pt-2 border-t border-zinc-800">
          <NavLink
            to={`/help${sessionSuffix}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-brand-red text-white shadow-sm'
                  : 'text-zinc-400 hover:bg-sidebar-hover hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <HelpCircle className="w-4 h-4 flex-shrink-0" />
                <span>Help</span>
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 block" />}
              </>
            )}
          </NavLink>
        </div>
      </nav>

      {/* User + Status */}
      <div className="px-4 py-3 border-t border-zinc-800">
        {/* User info */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-brand-red flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-zinc-300 text-xs font-medium truncate">{user?.name || 'User'}</div>
            {isAdmin && (
              <div className="text-yellow-500 text-[9px] font-bold uppercase tracking-wider">Admin</div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* System Status */}
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              agentReady ? 'bg-brand-red shadow-[0_0_6px_#EE0000]' : 'bg-zinc-600'
            }`}
          />
          <div>
            <div
              className={`text-[10px] font-bold tracking-widest uppercase ${
                agentReady ? 'text-brand-red' : 'text-zinc-500'
              }`}
            >
              System Status
            </div>
            <div className="text-zinc-500 text-xs mt-0.5">
              {agentReady ? 'Agent Ready' : 'Idle'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
