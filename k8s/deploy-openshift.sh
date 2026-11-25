#!/usr/bin/env bash
# Build, push, and deploy must-gather to OpenShift.
#
# Builds from repo root:
#   API:      src/api/dockerfile-api  (includes content/ + docs/ui/ legal markdown)
#   Frontend: frontend/dockerfile-frontend  (includes content/ for @content/*)
#
# Prerequisites:
#   - podman, oc logged in
#   - src/api/config/config.json with claude.service_account_key_data
#   - docs/ui/*.md and content/legal_documents.json present (AIA acceptance bundle)
#
# Usage:
#   ./k8s/deploy-openshift.sh
#   SKIP_BUILD=1 ./k8s/deploy-openshift.sh
#   LLM_KEY_FILE=/path/to/sa-key.json ./k8s/deploy-openshift.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAMESPACE="${NAMESPACE:-must-gather}"
FRONTEND_IMAGE="${FRONTEND_IMAGE:-quay.io/intelliaide/intelliaide-frontend:latest}"
API_IMAGE="${API_IMAGE:-quay.io/intelliaide/intelliaide-api:latest}"
CONFIG_PATH="${CONFIG_PATH:-${ROOT_DIR}/src/api/config/config.json}"
LEGAL_REGISTRY="${ROOT_DIR}/content/legal_documents.json"
DOCS_UI="${ROOT_DIR}/docs/ui"
LLM_KEY_FILE="${LLM_KEY_FILE:-}"
SKIP_BUILD="${SKIP_BUILD:-0}"

cd "${ROOT_DIR}"

if [[ ! -f "${CONFIG_PATH}" ]]; then
  echo "Missing ${CONFIG_PATH}. Create it before deploying." >&2
  exit 1
fi

if [[ ! -f "${LEGAL_REGISTRY}" ]]; then
  echo "Missing ${LEGAL_REGISTRY} (legal document registry)." >&2
  exit 1
fi

for ui_doc in AI_USAGE_NOTICE.md INTELLIAIDE_USER_GUIDE.md CUSTOMER_UPLOADED_CONTENT_AI_POLICY.md; do
  if [[ ! -f "${DOCS_UI}/${ui_doc}" ]]; then
    echo "Missing ${DOCS_UI}/${ui_doc} - required in API image for acceptance/legal endpoints." >&2
    exit 1
  fi
done

if command -v jq >/dev/null 2>&1; then
  bundle_json="$(jq -r '._bundle_version // empty' "${LEGAL_REGISTRY}")"
  bundle_cfg="$(jq -r '.notice.document_version // empty' "${CONFIG_PATH}")"
  if [[ -n "${bundle_json}" && -n "${bundle_cfg}" && "${bundle_json}" != "${bundle_cfg}" ]]; then
    echo "WARNING: notice.document_version in config.json is '${bundle_cfg}' but" >&2
    echo "         content/legal_documents.json _bundle_version is '${bundle_json}'." >&2
    echo "         Align them so acceptance gating matches the deployed legal bundle." >&2
  fi
fi

if [[ "${SKIP_BUILD}" != "1" ]]; then
  echo "==> Building images (context: repo root)"
  podman build -f frontend/dockerfile-frontend -t "${FRONTEND_IMAGE}" .
  podman build -f src/api/dockerfile-api -t "${API_IMAGE}" .

  echo "==> Pushing images"
  podman push "${FRONTEND_IMAGE}"
  podman push "${API_IMAGE}"
else
  echo "==> SKIP_BUILD=1 - skipping podman build/push"
fi

echo "==> Apply base manifests (route before RBAC for OAuth client)"
oc apply -f k8s/namespace.yaml
oc apply -f k8s/openshift-routes.yaml
oc apply -f k8s/rbac.yaml
oc apply -f k8s/configmap.yaml
oc apply -f k8s/shared-pvc.yaml

echo "==> Sync secrets from config.json (required - do NOT oc apply secret.yaml)"
if [[ -n "${LLM_KEY_FILE}" && -f "${LLM_KEY_FILE}" ]]; then
  "${ROOT_DIR}/k8s/sync-secrets-from-config.sh" "${CONFIG_PATH}" "${LLM_KEY_FILE}"
else
  "${ROOT_DIR}/k8s/sync-secrets-from-config.sh" "${CONFIG_PATH}"
fi

echo "==> Sync log_config.json ConfigMap (runtime log ML settings - no image rebuild)"
"${ROOT_DIR}/k8s/sync-log-config-configmap.sh"

echo "==> Deploy workloads"
oc apply -f k8s/api-deployment.yaml
oc apply -f k8s/frontend-deployment.yaml
oc apply -f k8s/openshift-routes.yaml

echo "==> Fix OAuth client (safe if route/SA already aligned)"
"${ROOT_DIR}/k8s/fix-oauth-client.sh"

echo "==> Verify rollouts"
oc rollout status deploy/must-gather-api -n "${NAMESPACE}" --timeout=300s
oc rollout status deploy/must-gather-frontend -n "${NAMESPACE}" --timeout=300s

echo "==> Routes"
oc get routes -n "${NAMESPACE}"

FRONTEND_HOST="$(oc get route must-gather-frontend-route -n "${NAMESPACE}" -o jsonpath='{.spec.host}' 2>/dev/null || true)"
if [[ -n "${FRONTEND_HOST}" ]]; then
  echo ""
  echo "App URL: https://${FRONTEND_HOST}/"
  echo "Login: kubeadmin / cluster-admin (ROSA) or add HTPasswd user:"
  echo "  ./k8s/add-htpasswd-user.sh <username> '<password>'"
  echo "See k8s/AUTHENTICATION.md"
fi

echo "Deploy complete."
