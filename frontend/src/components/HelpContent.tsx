import { NOTICE_DOCUMENT_URL, legalDocumentUrl } from '../services/api';

export default function HelpContent() {
  return (
    <>
      <h2 className="text-2xl font-bold text-slate-800 mb-4">
        Welcome to Intelliaide AI-Powered RCA Assistant
      </h2>
      <p className="text-slate-600 mb-6 leading-relaxed">
        This AI-driven solution helps you rapidly identify root causes from
        OpenShift / Kubernetes must-gather diagnostic bundles. Upload an archive or
        provide a Red Hat support case number, and the AI will analyze your logs,
        YAML configs, and cluster state to produce a comprehensive Root Cause Analysis.
      </p>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-8">
        <h3 className="text-lg font-semibold text-slate-800 mb-3">
          User guide &amp; limitations
        </h3>
        <p className="text-slate-700 mb-3 leading-relaxed">
          The full <strong>IntelliAide User Guide</strong> covers business purpose, architecture,
          operational limits, security, and compliance. You can also proceed with a{' '}
          <strong>manual RCA</strong> (local must-gather review, standard support workflows) when
          policy or situation requires avoiding cloud LLM analysis.
        </p>
        <ul className="list-disc list-inside space-y-2 text-slate-700 mb-4 text-sm">
          <li>
            Manual path: extract the bundle locally and use your usual runbooks and tools — no requirement to use IntelliAide or a cloud LLM.
          </li>
          <li>Do not submit sovereign, CSS, or FedRAMP-prohibited data to the configured LLM.</li>
          <li>AI outputs are drafts; verify before acting or sharing externally.</li>
        </ul>
        <a
          href={legalDocumentUrl('user_guide')}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mr-4 text-sm font-medium text-red-700 underline hover:text-red-800"
        >
          Open User Guide ↗
        </a>
        <a
          href={NOTICE_DOCUMENT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-amber-800 underline hover:text-amber-900"
        >
          View full AI Usage Notice ↗
        </a>
      </div>

      {/* AIA-014: AI Usage & Transparency */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mb-8">
        <h3 className="text-lg font-semibold text-amber-900 mb-3">
          🛡️ AI Usage &amp; Transparency
        </h3>
        <p className="text-slate-700 mb-3 leading-relaxed">
          Intelliaide uses a <strong>cloud-hosted large language model service</strong>{' '}
          configured by your instance administrator to perform analysis. Here is what you should
          know:
        </p>
        <ul className="list-disc list-inside space-y-2 text-slate-700 mb-4">
          <li>
            <strong>What is sent to the LLM:</strong> Selected excerpts from your must-gather
            (YAML configs, log fragments, error aggregates) — not the raw archive in its entirety.
          </li>
          <li>
            <strong>What is NOT sent:</strong> Intelliaide performs on-cluster pre-processing
            to reduce volume. Full must-gather files are stored only on your cluster's shared PVC.
          </li>
          <li>
            <strong>AI output must be reviewed:</strong> All RCA reports, summaries, and
            recommendations are AI-generated drafts. They may contain errors, omissions,
            or outdated information.
          </li>
          <li>
            <strong>Sovereign-data responsibility:</strong> Do not submit data you are
            prohibited from sharing with the configured LLM provider. You are responsible
            for complying with your organization's data-classification policies.
          </li>
          <li>
            <strong>Exports:</strong> Downloaded PDFs, ZIPs, and DOCX files carry an
            "AI-Generated" disclaimer. Handle them per your organization's policies.
          </li>
        </ul>
        <a
          href={NOTICE_DOCUMENT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-amber-800 underline hover:text-amber-900"
        >
          View full AI Usage Notice ↗
        </a>
      </div>

      <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Getting Started</h3>
      <p className="text-slate-600 mb-4 leading-relaxed">
        You are automatically authenticated via your Red Hat corporate Google account.
        The <strong>Dashboard</strong> is your home page for submitting new jobs and
        tracking all your past and active sessions.
      </p>

      <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Submitting an Analysis Job</h3>
      <p className="text-slate-600 mb-3 leading-relaxed">
        From the <strong>Dashboard</strong>, enter an issue description and then use the
        toggle to pick your submission method:
      </p>
      <ol className="list-decimal list-inside space-y-3 text-slate-600 mb-6">
        <li>
          <span className="font-medium">Upload File:</span> Drag-and-drop or browse for
          a <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">.tar.gz</code> or{' '}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">.zip</code> must-gather
          archive, then click <strong>Submit Job</strong>.
        </li>
        <li>
          <span className="font-medium">Fetch by Case #:</span> Enter your Red Hat support
          case number and click <strong>Fetch Must-Gather</strong>. The system downloads
          the archive from Hydra automatically. Once ready, click{' '}
          <strong>Submit Job</strong>.
        </li>
      </ol>
      <p className="text-slate-600 mb-6 leading-relaxed">
        Submitted jobs appear on the <strong>Job Status Overview</strong> board, where you
        can track status, view progress, and access completed reports.
      </p>

      <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Monitoring Progress</h3>
      <ul className="list-disc list-inside space-y-2 text-slate-600 mb-6">
        <li>
          Click <strong>View Progress</strong> on any running job to open the{' '}
          <strong>Live Analysis</strong> page.
        </li>
        <li>
          Shows real-time workflow steps (extracting, file selection, YAML processing,
          log processing, data aggregation, RCA analysis), a terminal console with live
          agent output, and an overall progress bar.
        </li>
        <li>
          The <strong>Deepening Tier</strong> indicator shows which analysis round is
          active: Tier 1, Tier 2, or Final.
        </li>
        <li>
          You can <strong>Cancel</strong> a running analysis at any time.
        </li>
      </ul>

      <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Reviewing Results</h3>
      <p className="text-slate-600 mb-4 leading-relaxed">
        After an analysis completes, click <strong>View Report</strong> on the Dashboard.
        Your results are organized into the following sections:
      </p>
      <ul className="list-disc list-inside space-y-2 text-slate-600 mb-6">
        <li>
          <span className="font-medium">RCA Summary:</span> Executive overview — a concise
          narrative covering the issue, root cause, resolution, and key findings.
        </li>
        <li>
          <span className="font-medium">RCA Detailed:</span> Full analysis with switchable{' '}
          <strong>Tier 1 / Tier 2 / Final</strong> tabs. Export individual stages as PDF,
          DOC, or ODT, or download the complete <strong>RCA Bundle (ZIP)</strong>.
        </li>
        <li>
          <span className="font-medium">Logging &amp; Tracing:</span> Source file references,
          error patterns, diagnostic diagrams, and file availability indexing.
        </li>
        <li>
          <span className="font-medium">Analytics:</span> Files processed, YAML/log
          classification, token usage, and cost breakdown per analysis tier.
        </li>
        <li>
          <span className="font-medium">Raw Console:</span> Complete agent output log with
          full-text search and copy support.
        </li>
      </ul>

      <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Deepening Analysis</h3>
      <p className="text-slate-600 mb-4 leading-relaxed">
        If the initial analysis does not fully capture the root cause:
      </p>
      <ol className="list-decimal list-inside space-y-2 text-slate-600 mb-6">
        <li>
          Open the <strong>RCA Detailed</strong> or <strong>RCA Summary</strong> page for the completed session.
        </li>
        <li>
          On first open, a popup explains which <strong>Tier</strong> you are viewing and
          that Tier 1 / Tier 2 reports are <strong>intermediate</strong> RCAs.
        </li>
        <li>
          At the bottom, use the <strong>Feedback for Further Analysis</strong> section
          to accept results or move to the next tier.
        </li>
        <li>
          Choose an action:
          <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
            <li>
              <strong>Accept Tier 2 Results:</strong> Tell us what went well (optional) to help improve the AI.
            </li>
            <li>
              <strong>Move to Tier 3:</strong> Describe what was missing or needs investigation, then click{' '}
              <strong>Submit &amp; Start Final</strong>.
            </li>
          </ul>
        </li>
        <li>
          The AI will investigate deeper, examining additional priority files. This can
          run up to <strong>3 tiers</strong> (Tier 1 → Tier 2 → Final). Each tier produces
          its own report, accessible as a separate tab.
        </li>
      </ol>

      <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-3">Admin Portal</h3>
      <p className="text-slate-600 mb-4 leading-relaxed">
        Admin users have access to the <strong>Admin</strong> page via the sidebar. It provides:
      </p>
      <ul className="list-disc list-inside space-y-2 text-slate-600 mb-2">
        <li>A system-wide view of all users' jobs, statuses, and history.</li>
        <li>Aggregate stats: total jobs, running, completed, failed, and active pods.</li>
        <li>PVC storage usage monitoring.</li>
        <li>The ability to cancel or delete any job.</li>
      </ul>
    </>
  );
}
