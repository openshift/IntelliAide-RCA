import { useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useSystemConfiguration } from '../contexts/SystemConfigurationContext';
import { AlertTriangle } from 'lucide-react';

/**
 * Runs after legal acceptance. Admins go to setup when unconfigured; others see a blocking notice.
 */
export default function ConfigurationGate({ children }: { children: ReactNode }) {
  const { isAdmin, loading: userLoading, logout } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { configured, loading: configLoading, error, refresh } = useSystemConfiguration();

  const loading = configLoading || userLoading;

  useEffect(() => {
    if (loading || configured !== false || !isAdmin) return;
    if (location.pathname.startsWith('/admin')) return;
    navigate('/admin/setup', { replace: true });
  }, [configured, isAdmin, loading, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-slate-500 text-sm">Checking system configuration...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md text-center">
          <p className="text-slate-800 font-medium mb-2">Could not verify system configuration</p>
          <p className="text-slate-600 text-sm mb-4">{error}</p>
          <button
            type="button"
            onClick={() => refresh()}
            className="px-4 py-2 rounded-lg bg-red-700 text-white text-sm font-medium hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (configured === false && isAdmin && !location.pathname.startsWith('/admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-slate-500 text-sm">Redirecting to administrator setup…</div>
      </div>
    );
  }

  if (configured === false && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-6">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-3">
            IntelliAide Is Not Yet Configured
          </h2>
          <p className="text-slate-600 mb-2">
            This instance has not been set up for use. The LLM provider
            credentials have not been configured.
          </p>
          <p className="text-slate-500 text-sm mb-8">
            Please ask your administrator to complete the initial setup
            before you can use IntelliAide.
          </p>
          <button
            type="button"
            onClick={logout}
            className="w-full py-3 rounded-lg font-semibold text-white bg-slate-800 hover:bg-slate-900 transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
