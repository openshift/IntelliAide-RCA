import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getSystemConfigured } from '../services/api';

interface SystemConfigurationContextValue {
  configured: boolean | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}

const SystemConfigurationContext = createContext<SystemConfigurationContextValue | null>(null);

export function SystemConfigurationProvider({ children }: { children: ReactNode }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const status = await getSystemConfigured();
      setConfigured(status.configured);
    } catch (err) {
      setConfigured(null);
      setError(err instanceof Error ? err.message : 'Could not check system configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SystemConfigurationContext.Provider value={{ configured, loading, error, refresh }}>
      {children}
    </SystemConfigurationContext.Provider>
  );
}

export function useSystemConfiguration(): SystemConfigurationContextValue {
  const ctx = useContext(SystemConfigurationContext);
  if (!ctx) {
    throw new Error('useSystemConfiguration must be used within SystemConfigurationProvider');
  }
  return ctx;
}
