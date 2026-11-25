# Intelliaide — AI Usage Notice & User Acceptance (One-Pager)

| Field | Value |
| --- | --- |
| **Product** | Intelliaide (AI-assisted Root Cause Analysis for OpenShift / Kubernetes must-gather) |
| **Document version** | 1.1 |
| **Effective date** | 2026-11-05 |
| **Bundle version (acceptance gate)** | 2.0 — see instance `notice.document_version` |
| **Instance / environment** | _Set by deployment (`INTELLIAIDE_INSTANCE_NAME`)_ |
| **Hosting organization** | _Customer team operating this deployment_ |

## 1. Purpose

This notice explains how **artificial intelligence (AI)** is used when you submit diagnostic data to Intelliaide. By accepting, you confirm that you understand these terms and that you are **authorized** to provide the data you submit.

The acceptance bundle **incorporates by reference** the **IntelliAide User Guide** and, on internal deployments, the **Customer Uploaded Content & AI Support Tools** policy (full text available in the acceptance modal).

## 2. What Intelliaide Does with AI

Intelliaide uses **large language models (LLMs)** and automation to:

- Interpret your **problem description** to route analysis.
- Run an **agentic workflow** (orchestration, file selection, staged RCA) that may invoke the LLM multiple times.
- Produce **draft RCA outputs** (summaries, tiered reports, recommendations).

**Local processing (on your cluster):** YAML and log analysis often use **on-cluster ML/templating** to reduce data volume. Raw must-gather archives are **not** sent wholesale to the model; only **selected and compressed excerpts** are used.

**Cloud AI processing:** LLM inference is performed through a **large language model service configured by the hosting team** via **Admin → Setup** (provider, model ID, endpoint, and credentials as shown there). Prompts and derived diagnostic content are transmitted to that service for the duration of the analysis.

## 3. What You Submit and What Leaves the Cluster

- You may upload a must-gather archive or reference a support case so Intelliaide can obtain diagnostics.
- **Stored on cluster:** Extracted files and analysis artifacts are kept on the deployment’s shared storage (PVC) unless your administrators configure otherwise.
- **Sent to the LLM:** Selected YAML snippets, log excerpts, aggregates, and workflow context—not necessarily the entire archive.
- **You are responsible** for not submitting data you are prohibited from sharing with the configured LLM provider or cloud region.

## 4. Human Review and Limitations

- All RCA text, summaries, and remediation suggestions are **AI-generated drafts**.
- Outputs may be **incorrect, incomplete, or outdated**; they are not a substitute for professional judgment or vendor support.
- You agree to **review and verify** AI output before acting on it or sharing it outside your team.

## 5. Exports and Labeling

Downloads (PDF, DOCX, ODT, ZIP bundles, analytics exports) include **AI-generated disclaimers**. Handle exports according to your organization’s **data-classification and export-control policies**.

## 6. Sovereign, CSS, and FedRAMP data

**Do not submit** Confirmed Sovereign Support, U.S. Government Customer Data, Confirmed Stateside Support (CSS), or FedRAMP-classified case material to this tool unless your organization has explicitly approved this deployment for that data class.

## 7. Acceptance and Records

When you click **I Accept** in the application, Intelliaide records your user identity, bundle **document_version**, and timestamp on the instance storage for audit purposes. If the bundle version changes, you may be asked to accept again.

## 8. Questions

Contact your **Intelliaide administrator** or hosting organization for instance-specific policies, approved models, data residency, and retention.
