import { Link, NavLink, Outlet } from 'react-router-dom';
import { Home, BarChart3, Settings } from 'lucide-react';
import { useSystemConfiguration } from '../../contexts/SystemConfigurationContext';

export default function AdminLayout() {
  const { configured } = useSystemConfiguration();

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Panel</h1>
          <p className="text-sm text-slate-500">System configuration and management</p>
        </div>
        <div className="flex items-center gap-2">
          {configured && (
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
            >
              <Home className="w-4 h-4" />
              Back to IntelliAide
            </Link>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        <NavLink
          to="/admin"
          end
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? 'border-yellow-600 text-yellow-700'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`
          }
        >
          <BarChart3 className="w-4 h-4" />
          Dashboard
        </NavLink>
        <NavLink
          to="/admin/setup"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? 'border-yellow-600 text-yellow-700'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`
          }
        >
          <Settings className="w-4 h-4" />
          Setup
        </NavLink>
      </div>

      {/* Page content */}
      <Outlet />
    </div>
  );
}
