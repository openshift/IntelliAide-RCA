import type { AgentMemory, CausalDag } from '../types';
import { RCA_STAGE_IDS, type RcaStageId } from '@/content/rcaStages';
import { mockAgentMemory, mockConsoleOutput, mockRCATier1, mockRCATier2, mockRCAFinal } from '../data/mockData';

export type { RcaStageId };

/**
 * API base URL:
 * - In dev (Vite), requests to /api/* are proxied to http://localhost:8000/*
 * - In production, set VITE_API_URL env var or default to same-origin /api
 */
const API_BASE = import.meta.env.VITE_API_URL || '/api';

/** Full AI Usage Notice (HTML) — same origin /api proxy or VITE_API_URL */
export const NOTICE_DOCUMENT_URL = `${API_BASE}/instance/notice-document`;

/** Rendered HTML for a registered legal/product document (AIA-007). */
export function legalDocumentUrl(documentId: string): string {
  return `${API_BASE}/instance/legal-document/${encodeURIComponent(documentId)}`;
}

export interface RequiredAcceptanceDocument {
  id: string;
  title: string;
  document_version: string;
  effective_date: string;
  url_path: string;
}

export interface AcceptanceStatus {
  accepted: boolean;
  current_version: string;
  effective_date: string;
  accepted_at: string | null;
  accepted_by?: string | null;
  accepted_email?: string | null;
  instance_name?: string;
  required_documents?: RequiredAcceptanceDocument[];
}

/**
 * Direct API URL for large uploads — bypasses the Nginx reverse proxy so the
 * browser talks straight to the backend pod via its own OpenShift route.
 * Resolved once at module load:
 *   1. Explicit VITE_API_DIRECT_URL env var (highest priority)
 *   2. Auto-detect from hostname: replace "frontend-route" → "api-route"
 *   3. Fall back to API_BASE (goes through Nginx — fine for dev / small files)
 */
const API_DIRECT_URL: string = (() => {
  if (import.meta.env.VITE_API_DIRECT_URL) return import.meta.env.VITE_API_DIRECT_URL;
  const host = window.location.hostname;
  if (host.includes('frontend-route')) {
    const apiHost = host.replace('frontend-route', 'api-route');
    return `${window.location.protocol}//${apiHost}`;
  }
  return API_BASE;
})();

let _backendAvailable: boolean | null = null;

async function checkBackend(): Promise<boolean> {
  if (_backendAvailable === true) return true;
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    _backendAvailable = res.ok;
  } catch {
    _backendAvailable = null;
  }
  return _backendAvailable ?? false;
}

export async function getPodStatus(): Promise<{ busy: boolean; active_session_id: string | null }> {
  if (await checkBackend()) {
    try {
      const res = await fetch(`${API_BASE}/pod-status`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return res.json();
    } catch { /* fall through */ }
  }
  return { busy: false, active_session_id: null };
}

/** Reset backend status so next call re-checks (call after starting backend). */
export function resetBackendCheck() {
  _backendAvailable = null;
}

export async function getAgentMemory(sessionId?: string | null): Promise<AgentMemory> {
  if (await checkBackend()) {
    try {
      const qs = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
      const res = await fetch(`${API_BASE}/agent-memory${qs}`);
      if (res.ok) return res.json();
    } catch { /* fall through to mock */ }
  }
  return mockAgentMemory;
}

export async function getWorkflowConsole(sessionId?: string | null): Promise<string> {
  if (await checkBackend()) {
    try {
      const qs = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
      const res = await fetch(`${API_BASE}/workflow-console${qs}`);
      if (res.ok) return res.text();
    } catch { /* fall through */ }
  }
  return mockConsoleOutput;
}

export async function getRCASummary(sessionId?: string | null): Promise<string> {
  if (await checkBackend()) {
    try {
      const qs = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
      const res = await fetch(`${API_BASE}/rca-summary${qs}`);
      if (res.ok) return res.text();
    } catch { /* fall through */ }
  }
  return mockAgentMemory.sessions[0]?.results.rca_summary ?? '';
}

/** Fetch a single RCA stage file.
 * @param stage   Tier_1 | Tier_2 | Final
 * @param session Optional session ID for scoping.
 */
export async function getRCAStage(
  stage: RcaStageId,
  session?: string | null,
): Promise<string> {
  if (await checkBackend()) {
    try {
      const qs = session ? `?session_id=${encodeURIComponent(session)}` : '';
      const res = await fetch(`${API_BASE}/rca-stage/${stage}${qs}`);
      if (res.status === 204 || !res.ok) return '';
      return res.text();
    } catch { /* fall through */ }
  }
  const mocks: Record<RcaStageId, string> = {
    Tier_1: mockRCATier1,
    Tier_2: mockRCATier2,
    Final:  mockRCAFinal,
  };
  return mocks[stage] ?? '';
}

/** Fetch the RCA executive summary text. */
export async function getRCAReportSummary(session?: string | null): Promise<string> {
  if (await checkBackend()) {
    try {
      const qs = session ? `?session_id=${encodeURIComponent(session)}` : '';
      const res = await fetch(`${API_BASE}/rca-report-summary${qs}`);
      if (res.status === 204 || !res.ok) return '';
      return res.text();
    } catch { /* fall through */ }
  }
  return '';
}

/** Fetch the causal-DAG JSON for a given stage. Returns null if not (yet) available —
 *  older sessions predating this feature, or best-effort generation failure. */
export async function getRCADag(
  stage: RcaStageId,
  session?: string | null,
): Promise<CausalDag | null> {
  if (await checkBackend()) {
    try {
      const qs = session ? `?session_id=${encodeURIComponent(session)}` : '';
      const res = await fetch(`${API_BASE}/rca-dag/${stage}${qs}`);
      if (res.status === 204 || !res.ok) return null;
      const data = await res.json();
      if (data && Array.isArray(data.nodes) && data.nodes.length > 0) return data as CausalDag;
      return null;
    } catch { /* fall through */ }
  }
  return null;
}

/** Fetch all three stage files in parallel; returns only those that have content. */
export async function getRCAStages(
  session?: string | null,
): Promise<{ stage: RcaStageId; text: string }[]> {
  const stages = RCA_STAGE_IDS;
  const results = await Promise.all(stages.map(s => getRCAStage(s, session)));
  return stages
    .map((stage, i) => ({ stage, text: results[i] }))
    .filter(r => r.text.trim().length > 0);
}

/** Query string for session-scoped report/download endpoints (both param names). */
function sessionQueryString(session?: string | null): string {
  const id = session?.trim();
  if (!id) return '';
  const enc = encodeURIComponent(id);
  return `?session_id=${enc}&session=${enc}`;
}

async function readDownloadError(res: Response, label: string): Promise<string> {
  let detail = `${label} (${res.status})`;
  try {
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === 'string') detail = body.detail;
      else if (Array.isArray(body.detail)) detail = body.detail.map(String).join('; ');
    } else {
      const text = (await res.text()).trim();
      if (text) detail = text.slice(0, 300);
    }
  } catch {
    /* keep default */
  }
  return detail;
}

async function triggerZipDownload(res: Response, filename: string, label: string): Promise<void> {
  if (!res.ok) {
    throw new Error(await readDownloadError(res, label));
  }
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('zip') && !ct.includes('octet-stream')) {
    throw new Error(await readDownloadError(res, label));
  }
  const blob = await res.blob();
  if (blob.size < 4) {
    throw new Error(`${label}: empty file returned`);
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Download all available RCA stage files as a ZIP bundle. */
export async function downloadRCABundleZip(session?: string | null): Promise<void> {
  const sid = session?.trim();
  if (!sid) {
    throw new Error('Session ID is required to download the RCA bundle.');
  }
  if (!(await checkBackend())) {
    throw new Error(
      'Backend is unavailable. RCA bundle download requires analysis results on the server.',
    );
  }
  const res = await fetch(`${API_BASE}/rca-bundle-zip${sessionQueryString(sid)}`);
  await triggerZipDownload(res, 'RCA_Reports_Bundle.zip', 'Bundle download failed');
}

/** Download the full bundle ZIP (all RCA stages + analytics PDF + logging/tracing doc). */
export async function downloadFullBundleZip(session?: string | null): Promise<void> {
  const sid = session?.trim();
  if (!sid) {
    throw new Error('Session ID is required to download the RCA bundle.');
  }
  if (!(await checkBackend())) {
    throw new Error(
      'Backend is unavailable. RCA bundle download requires analysis results on the server.',
    );
  }
  const res = await fetch(`${API_BASE}/full-bundle-zip${sessionQueryString(sid)}`);
  await triggerZipDownload(res, 'RCA_Bundle.zip', 'Full bundle download failed');
}


function _doUpload(
  url: string,
  formData: FormData,
  onProgress?: (pct: number) => void,
): Promise<{ local_file_id: string; filename: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else if (xhr.status === 413) {
        reject(new Error(
          'Request Entity Too Large — please convert your archive to .tar.gz and upload again.',
        ));
      } else {
        const detail = (() => {
          try { return JSON.parse(xhr.responseText).detail; } catch { return xhr.statusText; }
        })();
        reject(new Error(detail || `Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}

export async function uploadMustGather(
  archiveBlob: Blob,
  filename: string,
  onProgress?: (pct: number) => void,
): Promise<{ local_file_id: string; filename: string }> {
  if (!(await checkBackend())) {
    throw new Error('Backend is not available');
  }

  const formData = new FormData();
  formData.append('file', archiveBlob, filename);

  // Try the direct API route first (bypasses Nginx proxy, better for large files).
  // Only fall back to the proxied path on network/CORS errors — not on 4xx responses.
  if (API_DIRECT_URL !== API_BASE) {
    try {
      return await _doUpload(`${API_DIRECT_URL}/upload-must-gather`, formData, onProgress);
    } catch (err) {
      // Propagate 413 (and other meaningful HTTP errors) immediately — retrying
      // through the proxy would produce the same result.
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Too Large') || msg.includes('413')) throw err;
      onProgress?.(0);
    }
  }

  return _doUpload(`${API_BASE}/upload-must-gather`, formData, onProgress);
}

export async function startAnalysis(
  problemStatement: string,
  localFileId: string,
  rootFolder = '',
  caseNumber = '',
  owner = '',
) {
  if (await checkBackend()) {
    const body: Record<string, string> = {
      user_query: problemStatement,
      must_gather_root_folder: rootFolder,
      local_file_id: localFileId,
    };
    if (caseNumber.trim()) body.case_number = caseNumber.trim();
    if (owner.trim()) body.owner = owner.trim();
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(detail.detail || `API error ${res.status}`);
    }
    return res.json();
  }
  return { session_id: `session_mock_${Date.now()}`, status: 'started' };
}

export async function submitFeedback(
  sessionId: string,
  satisfactory: boolean,
  feedbackText = '',
  originalSessionId = '',
) {
  if (await checkBackend()) {
    const res = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        satisfactory,
        feedback_text: feedbackText,
        original_session_id: originalSessionId,
      }),
    });
    if (res.ok) return res.json();
    const errBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errBody.detail || `Feedback failed (${res.status})`);
  }
  return { status: 'ok' };
}

export async function initSession() {
  if (await checkBackend()) {
    await fetch(`${API_BASE}/init`, { method: 'POST' }).catch(() => {});
  }
}

export async function clearSession() {
  if (await checkBackend()) {
    await fetch(`${API_BASE}/clear`, { method: 'POST' }).catch(() => {});
  }
}

export async function cancelAnalysis(sessionId: string): Promise<void> {
  if (await checkBackend()) {
    await fetch(`${API_BASE}/cancel/${encodeURIComponent(sessionId)}`, { method: 'POST' }).catch(() => {});
  }
}

export async function getSessionStatus(sessionId: string) {
  if (await checkBackend()) {
    try {
      const res = await fetch(`${API_BASE}/status/${sessionId}`);
      if (res.ok) return res.json();
    } catch { /* fall through */ }
  }
  return { session_id: sessionId, status: 'unknown' };
}


export interface JobSession {
  session_id: string;
  status: string;
  phase: string;
  progress: number;
  message: string;
  case_number?: string;
  problem_statement?: string;
  created_at?: string;
  filename?: string;
  rca_summary?: string;
  error?: string;
  owner?: string;
  deepening_round?: number;
}

export async function getSessions(owner?: string): Promise<JobSession[]> {
  if (await checkBackend()) {
    try {
      const qs = owner ? `?owner=${encodeURIComponent(owner)}` : '';
      const res = await fetch(`${API_BASE}/sessions${qs}`);
      if (res.ok) return res.json();
    } catch { /* fall through */ }
  }
  return [];
}

/** Remove all completed / error / cancelled sessions from the server-side board. */
export async function clearSessionsHistory(): Promise<void> {
  if (await checkBackend()) {
    await fetch(`${API_BASE}/clear-sessions`, { method: 'POST' }).catch(() => {});
  }
}

export interface AttachmentOption {
  uuid: string;
  filename: string;
  size_bytes: number;
  created: string;
}

export type CaseAttachmentResult =
  | { status: 'downloading'; download_id: string; filename: string }
  | { status: 'downloaded'; local_file_id: string; filename: string }
  | { status: 'multiple'; attachments: AttachmentOption[] };

export type DownloadStatus =
  | { status: 'downloading'; filename: string }
  | { status: 'downloaded'; local_file_id: string; filename: string }
  | { status: 'error'; detail: string };

/** List must-gather attachments for a case (or kick off background download if only one). */
export async function fetchCaseAttachment(
  caseNumber: string,
): Promise<CaseAttachmentResult> {
  const res = await fetch(`${API_BASE}/case-attachments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ case_number: caseNumber }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail.detail || `Failed to fetch case attachment (${res.status})`);
  }
  return res.json();
}

/** Download a specific attachment UUID chosen by the user from a 'multiple' listing. */
export async function downloadSpecificAttachment(
  caseNumber: string,
  attachmentUuid: string,
  filename: string,
): Promise<{ download_id: string; filename: string }> {
  const res = await fetch(`${API_BASE}/case-attachments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ case_number: caseNumber, attachment_uuid: attachmentUuid, filename }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail.detail || `Download failed (${res.status})`);
  }
  return res.json();
}

/** Poll a background Hydra download until it completes or fails. */
export async function getDownloadStatus(downloadId: string): Promise<DownloadStatus> {
  const res = await fetch(`${API_BASE}/download-status/${encodeURIComponent(downloadId)}`);
  if (!res.ok) {
    throw new Error(`Download status check failed (${res.status})`);
  }
  return res.json();
}


// ---------------------------------------------------------------------------
// Admin API
// ---------------------------------------------------------------------------

export async function getWhoAmI(): Promise<{ name: string; email: string; is_admin: boolean }> {
  const res = await fetch(`${API_BASE}/whoami`, { credentials: 'same-origin' });
  if (!res.ok) return { name: '', email: '', is_admin: false };
  return res.json();
}

export interface AdminStats {
  total: number;
  running: number;
  completed: number;
  failed: number;
  active_pods: number;
  pvc_usage: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
    used_pct: number;
  };
  owners: Record<string, number>;
}

export async function getAdminStats(): Promise<AdminStats> {
  const res = await fetch(`${API_BASE}/admin/stats`, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Admin stats failed (${res.status})`);
  return res.json();
}

export async function getAdminSessions(): Promise<JobSession[]> {
  const res = await fetch(`${API_BASE}/admin/sessions`, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Admin sessions failed (${res.status})`);
  return res.json();
}

export async function adminCancelJob(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/cancel/${encodeURIComponent(sessionId)}`, {
    method: 'POST',
    credentials: 'same-origin',
  });
  if (!res.ok) throw new Error(`Admin cancel failed (${res.status})`);
}

export async function adminDeleteJob(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/delete/${encodeURIComponent(sessionId)}`, {
    method: 'POST',
    credentials: 'same-origin',
  });
  if (!res.ok) throw new Error(`Admin delete failed (${res.status})`);
}

// ---------------------------------------------------------------------------
// System configuration status
// ---------------------------------------------------------------------------

export interface SystemConfiguredStatus {
  configured: boolean;
  missing: string[];
}

export async function getSystemConfigured(): Promise<SystemConfiguredStatus> {
  const res = await fetch(`${API_BASE}/system/configured`, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`System configured check failed (${res.status})`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Admin config (LLM + Hydra) endpoints
// ---------------------------------------------------------------------------

export interface AdminConfigResponse {
  llm?: Record<string, unknown>;
  hydra?: Record<string, unknown>;
}

export interface AdminConfigSaveResult {
  status: string;
  configured: boolean;
  missing: string[];
}

export async function getAdminConfig(): Promise<AdminConfigResponse> {
  const res = await fetch(`${API_BASE}/admin/config`, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Admin config fetch failed (${res.status})`);
  return res.json();
}

export async function saveAdminConfig(data: Record<string, unknown>): Promise<AdminConfigSaveResult> {
  const res = await fetch(`${API_BASE}/admin/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Admin config save failed (${res.status})`);
  }
  return res.json();
}

export async function uploadAdminConfig(file: File): Promise<AdminConfigSaveResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/admin/config`, {
    method: 'POST',
    credentials: 'same-origin',
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Admin config upload failed (${res.status})`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Acceptance / AI Usage Notice (AIA-006, AIA-014, AIA-007)
// ---------------------------------------------------------------------------

export async function getAcceptanceStatus(): Promise<AcceptanceStatus> {
  const res = await fetch(`${API_BASE}/acceptance/status`, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Acceptance status check failed (${res.status})`);
  return res.json();
}

export async function postAcceptance(documentVersion: string): Promise<void> {
  const res = await fetch(`${API_BASE}/acceptance/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ document_version: documentVersion }),
  });
  if (!res.ok) throw new Error(`Acceptance submission failed (${res.status})`);
}

export async function getLegalDocumentContent(
  documentId: string,
): Promise<{ id: string; title: string; html: string }> {
  const res = await fetch(`${API_BASE}/instance/legal-document/${encodeURIComponent(documentId)}/content`, {
    credentials: 'same-origin',
  });
  if (!res.ok) throw new Error(`Legal document load failed (${res.status})`);
  return res.json();
}

export async function getNoticeDocumentContent(): Promise<{ title: string; html: string }> {
  const data = await getLegalDocumentContent('ai_usage_notice');
  return { title: data.title, html: data.html };
}

export async function getNoticeDocument(): Promise<string> {
  const res = await fetch(`${API_BASE}/instance/notice-document`, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Notice document fetch failed (${res.status})`);
  return res.text();
}
