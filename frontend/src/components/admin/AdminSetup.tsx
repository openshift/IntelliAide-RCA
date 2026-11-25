import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { useSystemConfiguration } from '../../contexts/SystemConfigurationContext';
import {
  getAdminConfig,
  saveAdminConfig,
  uploadAdminConfig,
  getSystemConfigured,
} from '../../services/api';
import {
  Save,
  Upload,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface LlmConfig {
  auth_type: string;
  api_key: string;
  service_account_key_file: string;
  service_account_key_data: {
    project_id: string;
    client_email: string;
    private_key: string;
    private_key_id: string;
    client_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_x509_cert_url: string;
    type: string;
    universe_domain: string;
  };
  api_url: string;
  model_id: string;
  max_tokens: number;
  max_chunk_tokens: number;
  verify_ssl: boolean;
  endpoint_pattern: string;
  custom_gateway: boolean;
  price_per_1m_input_tokens: number;
  price_per_1m_output_tokens: number;
  project_id: string;
}

interface HydraConfig {
  client_id: string;
  client_secret: string;
}

const DEFAULT_LLM: LlmConfig = {
  auth_type: '',
  api_key: '',
  service_account_key_file: '/secrets/gcloud/application_default_credentials.json',
  service_account_key_data: {
    project_id: '',
    client_email: '',
    private_key: '',
    private_key_id: '',
    client_id: '',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: '',
    type: 'service_account',
    universe_domain: 'googleapis.com',
  },
  api_url: 'https://aiplatform.googleapis.com',
  model_id: '',
  max_tokens: 16384,
  max_chunk_tokens: 80000,
  verify_ssl: true,
  endpoint_pattern: '',
  custom_gateway: true,
  price_per_1m_input_tokens: 3.0,
  price_per_1m_output_tokens: 15.0,
  project_id: '',
};

const DEFAULT_HYDRA: HydraConfig = {
  client_id: '',
  client_secret: '',
};

type Tab = 'llm' | 'hydra';

export default function AdminSetup() {
  const { isAdmin } = useUser();
  const { refresh: refreshSystemConfigured } = useSystemConfiguration();
  const fileRef = useRef<HTMLInputElement>(null);

  const [llm, setLlm] = useState<LlmConfig>({ ...DEFAULT_LLM });
  const [hydra, setHydra] = useState<HydraConfig>({ ...DEFAULT_HYDRA });
  const [activeTab, setActiveTab] = useState<Tab>('llm');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [configured, setConfigured] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, status] = await Promise.all([
        getAdminConfig(),
        getSystemConfigured(),
      ]);
      if (cfg.llm) {
        setLlm(prev => ({ ...prev, ...cfg.llm, service_account_key_data: { ...prev.service_account_key_data, ...(cfg.llm?.service_account_key_data || {}) } }));
      }
      if (cfg.hydra) {
        setHydra(prev => ({ ...prev, ...cfg.hydra }));
      }
      setConfigured(status.configured);
      setMissingFields(status.missing || []);
    } catch {
      // First time — no config yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const data: Record<string, unknown> = {};
      data.llm = llm;
      data.hydra = hydra;
      const result = await saveAdminConfig(data);
      setConfigured(result.configured);
      setMissingFields(result.missing || []);
      setMessage({ type: 'success', text: 'Configuration saved successfully.' });
      await refreshSystemConfigured();
      fetchConfig();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setMessage({ type: 'error', text: 'Please upload a .json file.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed.llm && !parsed.hydra) {
        setMessage({ type: 'error', text: 'JSON must contain "llm" and/or "hydra" keys.' });
        setSaving(false);
        return;
      }

      const result = await uploadAdminConfig(file);
      setConfigured(result.configured);
      setMissingFields(result.missing || []);
      setMessage({ type: 'success', text: `Config uploaded from ${file.name}.` });
      await refreshSystemConfigured();
      fetchConfig();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Upload failed' });
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Status banner */}
      <div className={`mb-6 rounded-lg border px-4 py-3 flex items-center justify-between gap-3 flex-wrap ${
        configured
          ? 'bg-green-50 border-green-200'
          : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-center gap-3">
          {configured
            ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            : <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          }
          <div>
            <p className={`text-sm font-medium ${configured ? 'text-green-800' : 'text-amber-800'}`}>
              {configured ? 'System is configured and ready.' : 'System is not yet configured.'}
            </p>
            {!configured && missingFields.length > 0 && (
              <p className="text-xs text-amber-600 mt-0.5">
                Missing: {missingFields.join(', ')}
              </p>
            )}
          </div>
        </div>
        {configured && (
          <Link
            to="/"
            className="text-sm font-medium text-green-800 underline hover:text-green-900 whitespace-nowrap"
          >
            Open IntelliAide home →
          </Link>
        )}
      </div>

      {/* File upload */}
      <div className="mb-6 flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm text-slate-700 transition-colors disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          Upload Config JSON
        </button>
        <span className="text-xs text-slate-400">
          Upload a JSON file with <code className="bg-slate-100 px-1 rounded">llm</code> and/or <code className="bg-slate-100 px-1 rounded">hydra</code> keys
        </span>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 rounded-lg border px-4 py-3 text-sm flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            : <XCircle className="w-4 h-4 flex-shrink-0" />
          }
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        <button
          onClick={() => setActiveTab('llm')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium border border-b-0 transition-colors ${
            activeTab === 'llm'
              ? 'bg-white text-slate-800 border-slate-200'
              : 'bg-slate-100 text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          LLM Configuration
          {configured
            ? <CheckCircle2 className="w-3.5 h-3.5 ml-2 inline text-green-500" />
            : <XCircle className="w-3.5 h-3.5 ml-2 inline text-red-400" />
          }
        </button>
        <button
          onClick={() => setActiveTab('hydra')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium border border-b-0 transition-colors ${
            activeTab === 'hydra'
              ? 'bg-white text-slate-800 border-slate-200'
              : 'bg-slate-100 text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          Hydra SSO
          {hydra.client_id && hydra.client_secret
            ? <CheckCircle2 className="w-3.5 h-3.5 ml-2 inline text-green-500" />
            : <span className="w-3.5 h-3.5 ml-2 inline-block rounded-full bg-slate-300" />
          }
        </button>
      </div>

      {/* Form content */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {activeTab === 'llm' && (
          <div className="space-y-5">
            <h3 className="font-semibold text-slate-800 mb-4">LLM Provider Configuration</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Auth Type" required>
                <select
                  value={llm.auth_type}
                  onChange={e => setLlm(p => ({ ...p, auth_type: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Select...</option>
                  <option value="gcloud">GCP Vertex AI (gcloud)</option>
                  <option value="api_key">API Key (direct)</option>
                </select>
              </Field>

              <Field label="Model ID" required>
                <input
                  type="text"
                  value={llm.model_id}
                  onChange={e => setLlm(p => ({ ...p, model_id: e.target.value }))}
                  placeholder="claude-sonnet-4-6"
                  className="input-field"
                />
              </Field>

              <Field label="API URL">
                <input
                  type="text"
                  value={llm.api_url}
                  onChange={e => setLlm(p => ({ ...p, api_url: e.target.value }))}
                  placeholder="https://aiplatform.googleapis.com"
                  className="input-field"
                />
              </Field>

              <Field label="Endpoint Pattern" required>
                <input
                  type="text"
                  value={llm.endpoint_pattern}
                  onChange={e => setLlm(p => ({ ...p, endpoint_pattern: e.target.value }))}
                  placeholder="https://aiplatform.googleapis.com/v1/projects/{project_id}/..."
                  className="input-field"
                />
              </Field>

              <Field label="Project ID">
                <input
                  type="text"
                  value={llm.project_id}
                  onChange={e => setLlm(p => ({ ...p, project_id: e.target.value }))}
                  placeholder="my-gcp-project"
                  className="input-field"
                />
              </Field>

              <Field label="Max Tokens">
                <input
                  type="number"
                  value={llm.max_tokens}
                  onChange={e => setLlm(p => ({ ...p, max_tokens: Number(e.target.value) }))}
                  className="input-field"
                />
              </Field>
            </div>

            {llm.auth_type === 'api_key' && (
              <Field label="API Key" required>
                <input
                  type="password"
                  value={llm.api_key}
                  onChange={e => setLlm(p => ({ ...p, api_key: e.target.value }))}
                  placeholder="Enter API key"
                  className="input-field"
                />
              </Field>
            )}

            {llm.auth_type === 'gcloud' && (
              <>
                <hr className="border-slate-200" />
                <h4 className="text-sm font-medium text-slate-700">Service Account Key Data</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="SA Project ID" required>
                    <input
                      type="text"
                      value={llm.service_account_key_data.project_id}
                      onChange={e => setLlm(p => ({ ...p, service_account_key_data: { ...p.service_account_key_data, project_id: e.target.value } }))}
                      className="input-field"
                    />
                  </Field>
                  <Field label="Client Email">
                    <input
                      type="text"
                      value={llm.service_account_key_data.client_email}
                      onChange={e => setLlm(p => ({ ...p, service_account_key_data: { ...p.service_account_key_data, client_email: e.target.value } }))}
                      className="input-field"
                    />
                  </Field>
                  <Field label="Private Key ID">
                    <input
                      type="text"
                      value={llm.service_account_key_data.private_key_id}
                      onChange={e => setLlm(p => ({ ...p, service_account_key_data: { ...p.service_account_key_data, private_key_id: e.target.value } }))}
                      className="input-field"
                    />
                  </Field>
                  <Field label="Client ID">
                    <input
                      type="text"
                      value={llm.service_account_key_data.client_id}
                      onChange={e => setLlm(p => ({ ...p, service_account_key_data: { ...p.service_account_key_data, client_id: e.target.value } }))}
                      className="input-field"
                    />
                  </Field>
                </div>
                <Field label="Private Key">
                  <textarea
                    value={llm.service_account_key_data.private_key}
                    onChange={e => setLlm(p => ({ ...p, service_account_key_data: { ...p.service_account_key_data, private_key: e.target.value } }))}
                    rows={4}
                    placeholder="Paste PEM-encoded private key"
                    className="input-field font-mono text-xs"
                  />
                </Field>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <Field label="Custom Gateway">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={llm.custom_gateway}
                    onChange={e => setLlm(p => ({ ...p, custom_gateway: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-yellow-600 focus:ring-yellow-500"
                  />
                  <span className="text-sm text-slate-600">Enabled</span>
                </label>
              </Field>
              <Field label="Verify SSL">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={llm.verify_ssl}
                    onChange={e => setLlm(p => ({ ...p, verify_ssl: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-yellow-600 focus:ring-yellow-500"
                  />
                  <span className="text-sm text-slate-600">Enabled</span>
                </label>
              </Field>
            </div>
          </div>
        )}

        {activeTab === 'hydra' && (
          <div className="space-y-5">
            <h3 className="font-semibold text-slate-800 mb-4">Red Hat Hydra SSO Configuration</h3>
            <p className="text-sm text-slate-500 mb-4">
              Client credentials for accessing Red Hat case attachments via the Hydra REST API.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Client ID">
                <input
                  type="text"
                  value={hydra.client_id}
                  onChange={e => setHydra(p => ({ ...p, client_id: e.target.value }))}
                  placeholder="hydra-client-id"
                  className="input-field"
                />
              </Field>
              <Field label="Client Secret">
                <input
                  type="password"
                  value={hydra.client_secret}
                  onChange={e => setHydra(p => ({ ...p, client_secret: e.target.value }))}
                  placeholder="hydra-client-secret"
                  className="input-field"
                />
              </Field>
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="mt-8 pt-5 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
