# Contributing to IntelliAide

Thanks for your interest in contributing. IntelliAide is an AI-assisted
root-cause-analysis (RCA) service for OpenShift must-gather data.

## Code of Conduct

This project follows the [Red Hat Open Source Code of Conduct](https://www.redhat.com/en/about/open-source-code-of-conduct).

## Reporting issues

Functional bugs and feature requests are tracked in Jira under the
**OCPSTRAT** project. Please do **not** attach customer must-gather archives,
cluster credentials, or case data to any public issue.

Security vulnerabilities must **not** be filed as public issues — see
[SECURITY.md](SECURITY.md).

## Development setup

```bash
# Backend (Python >= 3.8, developed against 3.11)
make install-dev      # pip install -e .[dev] + pre-commit install

# Frontend (Node / Vite)
make frontend-install
```

## Before you open a pull request

```bash
make format           # black + isort
make lint             # black --check, isort --check-only, flake8, mypy
make test             # pytest with coverage
make frontend-build   # type-check (tsc -b) + production bundle
```

`pre-commit` runs the same formatting, YAML/JSON validation, large-file and
merge-conflict checks on every commit. Run `pre-commit run --all-files` if you
need to validate the whole tree.

## Container images

Both images build **from the repository root** so that shared `content/` and
`docs/ui/` are in the build context:

```bash
podman build -f src/api/Dockerfile  -t intelliaide-api:latest  .
podman build -f frontend/Dockerfile -t intelliaide-frontend:latest .
```

`src/api/dockerfile-api` and `frontend/dockerfile-frontend` are the legacy
local-OpenShift variants.

## Commit messages

Use imperative mood, a <= 72 character subject, and reference the Jira issue in
a trailer:

```
component: short imperative summary

Longer body explaining what changed and why.

Tracking: OCPSTRAT-1234
```

## Pull request flow

This repository uses [Prow](https://docs.ci.openshift.org/docs/). Reviewers
apply `/lgtm` and approvers listed in [OWNERS](OWNERS) apply `/approve`; both
are required before Tide merges a PR.

## Never commit

- Customer must-gather archives, logs, or case data
- `kubeconfig`, htpasswd files, service-account JSON, ADC credentials
- A populated `src/api/config/config.json` (use `config.json.template`)
- `k8s/secret.yaml` / `k8s/app-secret.yaml` (use the `*.template.yaml` files)

These are covered by [.gitignore](.gitignore); do not use `git add -f` to
bypass it.
