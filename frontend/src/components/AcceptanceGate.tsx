import { useState, useEffect } from 'react';
import { getAcceptanceStatus, type AcceptanceStatus } from '../services/api';
import { useUser } from '../contexts/UserContext';
import AcceptanceModal from './AcceptanceModal';

/** Legal acceptance first — all users including admins, before config or app routes. */
export default function AcceptanceGate({ children }: { children: React.ReactNode }) {
  const { loading: userLoading } = useUser();
  const [status, setStatus] = useState<AcceptanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const s = await getAcceptanceStatus();
      setStatus(s);
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : 'Could not check acceptance status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLoading) return;
    fetchStatus();
  }, [userLoading]);

  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-slate-500 text-sm">Checking AI usage notice status…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md text-center">
          <p className="text-slate-800 font-medium mb-2">Could not verify AI Usage Notice acceptance</p>
          <p className="text-slate-600 text-sm mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchStatus}
            className="px-4 py-2 rounded-lg bg-red-700 text-white text-sm font-medium hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (status && !status.accepted) {
    return (
      <AcceptanceModal
        documentVersion={status.current_version}
        effectiveDate={status.effective_date}
        instanceName={status.instance_name}
        requiredDocuments={status.required_documents}
        onAccepted={fetchStatus}
      />
    );
  }

  return <>{children}</>;
}
