---
document_id: user_guide
title: IntelliAide User Guide
document_version: "1.1"
effective_date: "2026-11-05"
audience: Internal Red Hat associates and approved internal users
product: IntelliAide
status: Product transparency and usage guide (AIA-007)
---

# IntelliAide User Guide

**Internal use — OpenShift / Kubernetes must-gather root-cause analysis**

| | |
| --- | --- |
| **Audience** | Internal Red Hat associates and approved users on a hosted IntelliAide instance |
| **Purpose** | Business purpose, limitations, notices, and how to work with or without AI-assisted analysis |
| **Acceptance bundle** | This is **document 2 of 3**. Read **document 1** (AI Usage Notice) and **document 3** (Customer Uploaded Content & AI policy, internal deployments) in the same acceptance flow before using the product |

Follow the acceptance wizard in order: AI Usage Notice, then this guide, then the Customer Uploaded Content policy. Do not skip ahead; each step must be acknowledged separately.

## 1. Business purpose

IntelliAide helps engineers produce a **first-pass root-cause analysis (RCA)** from OpenShift or Kubernetes **must-gather** bundles. You describe the symptom, provide a must-gather (upload or support-case attachment where enabled), and receive tiered RCA output with evidence, chronology, and **advisory** remediation text.

IntelliAide is **read-only** on the bundle you submit. It does not change live clusters. Outputs are **AI-assisted drafts** and must be reviewed before you act on them or share them externally.

**Typical value:** faster triage on large bundles (many files / large archives) than manual log review alone, with explicit coverage and confidence in the report.

## 2. How it works (summary)

1. You use the **web Portal** (and optional REST API) on your organization’s IntelliAide deployment.
2. On-cluster processing selects and compresses YAML and log evidence (local ML and templating).
3. A **configured large language model (LLM) service** performs routing, staged RCA, and report generation using only the distilled payload—not the raw archive in full.
4. Results are stored per session (tiered reports, exports, analytics). You may request **deeper analysis** via in-product feedback without re-uploading the same archive.

Your administrator configures which LLM provider, model, and credentials the instance uses. End users do not configure the LLM in the Portal.

## 3. Who should use this

IntelliAide is aimed at Red Hat support and engineering workflows that already use must-gathers: incident response, case analysis, networking or platform triage, and customer escalation handoffs. You do not need a separate “persona-specific” document—use this guide, the AI Usage Notice, and your team’s standard support procedures together.

## 4. Getting started (Portal)

1. Sign in to your instance’s IntelliAide URL (organization SSO).
2. Complete the **legal acceptance** flow if prompted (three documents, in order).
3. From the **Dashboard**, enter an issue description.
4. Submit a must-gather **upload** (`.zip`, `.tar.gz`, `.tgz`) or **fetch by case number** when Hydra integration is enabled on your instance.
5. Track progress under **Live Analysis**; open **RCA Report** when complete.
6. Export PDF, DOC, ODT, or a ZIP bundle as needed. Use **feedback** if you need a deeper tier of analysis.

If the instance shows **not configured**, an **administrator** must complete **Admin → Setup** (LLM and optional Hydra settings) before analysis can run. Non-admin users should contact their instance owner.

## 5. Instance prerequisites (administrator)

Before associates can analyze must-gathers, an administrator must configure the instance via **Admin → Setup**:

| Area | What the admin provides |
| --- | --- |
| **LLM** | Authentication type (API key or Google Cloud service account, per your deployment), approved **model ID**, **endpoint** pattern, and related fields shown in the setup form |
| **Hydra (optional)** | Client ID and secret if **Fetch by case number** is required |
| **Deployment** | OpenShift (or equivalent) routes, storage, and secrets are handled by your platform team—not by end users |

End users need **network access to the IntelliAide frontend** and permission to submit the diagnostic data they handle under Red Hat policy. **Cluster `oc` access or API pod shell access is not required** to upload or analyze must-gathers through the Portal.

## 6. Supported and unsupported inputs

**Supported:**

- Must-gather archives via Portal upload.
- Support-case attachments via case number when Hydra is configured.

**Not supported as primary input:**

- Standalone sos-only dumps unless they are part of a must-gather workflow you are already allowed to use.
- Live cluster exec, streaming logs, or metrics outside a must-gather tree.
- Automatic remediation or write actions against customer clusters.

**Operational limits (typical):**

- Jobs queue when many analyses run at once.
- Upload and session metadata may use ephemeral storage unless your administrators provision persistent volumes.
- Analysis depth is capped (tool iterations and tier rounds) per instance configuration.

## 7. Limitations and guardrails

- Recommendations are **text only**—no automated fixes on customer systems.
- Strongest on OpenShift must-gather layouts encoded in the product’s routing knowledge; novel failures still need expert judgment.
- AI output can be **wrong, incomplete, or outdated**—always verify before acting or escalating.
- Do **not** submit **Confirmed Sovereign Support**, **U.S. Government Customer Data**, **CSS**, or **FedRAMP**-class material unless your organization has explicitly approved this instance for that data class.
- Diagnostic excerpts selected for analysis may be sent to the **configured cloud LLM service**; treat uploads as customer confidential information per Red Hat policy and document 3 in this bundle.

## 8. Proceeding without IntelliAide (manual RCA)

You may perform RCA **without** IntelliAide or any LLM:

1. Extract the must-gather archive on your workstation or approved internal systems.
2. Inspect YAML, logs, and events with your usual tools, runbooks, and OpenShift/Kubernetes documentation.
3. Continue your standard support case workflow—no requirement to upload the bundle to an LLM service.
4. Choose manual analysis when policy forbids cloud LLM use, when data classification prohibits upload, when the environment is air-gapped, or when the failure is outside the product’s typical must-gather patterns.

IntelliAide is optional acceleration for first-pass evidence assembly; it does not replace manual investigation or vendor support processes when those are required.

## 9. REST API (integrators)

Automated clients must honor the same acceptance and data-handling rules as Portal users.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/whoami` | Authenticated identity |
| GET | `/acceptance/status` | Current acceptance bundle version |
| POST | `/acceptance/accept` | Record acceptance `{ "document_version": "..." }` |
| POST | `/analyze` | Start analysis (after acceptance and configuration) |
| GET | `/status/{session_id}` | Job progress |

Integrators should confirm acceptance status before calling analysis endpoints.

## 10. Feedback and help

Use in-product feedback on the RCA Report to request deeper tiers or report quality issues. Instance owners should publish Slack, Jira, or mailing-list contacts for your deployment where applicable.
