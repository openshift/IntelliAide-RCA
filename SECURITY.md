# Security Policy

## Reporting a vulnerability

**Do not open a public GitHub issue or pull request for security problems.**

Report suspected vulnerabilities in IntelliAide to the Red Hat Product Security
team:

- Web: <https://access.redhat.com/security/team/contact/>
- Email: `secalert@redhat.com`
  ([PGP key](https://access.redhat.com/security/team/key))

Red Hat Product Security will acknowledge your report and coordinate
disclosure, including CVE assignment where applicable.

## Handling sensitive data

IntelliAide processes OpenShift **must-gather** archives, which routinely
contain cluster-identifying and potentially customer-sensitive information.
When reporting a bug or attaching reproduction material:

- Never attach raw must-gather archives, cluster logs, or support case data to
  a public issue or pull request.
- Redact cluster names, node IPs, route hostnames, project IDs, and account
  identifiers.
- Never include LLM API keys, GCP service-account JSON, Application Default
  Credentials, `kubeconfig` files, or htpasswd files.

## Credentials in this repository

This repository contains **templates only**. Real values are supplied at deploy
time:

| Template (committed) | Real file (gitignored) |
|---|---|
| `src/api/config/config.json.template` | `src/api/config/config.json` |
| `k8s/secret.template.yaml` | `k8s/secret.yaml` |
| `k8s/app-secret.template.yaml` | `k8s/app-secret.yaml` |

LLM and Hydra credentials are provided by an administrator through the Admin
Setup UI and stored on the deployment PVC — they are never baked into a
container image or committed to git.

If you believe a credential has been committed, treat it as compromised:
rotate it immediately and contact Red Hat Product Security.
