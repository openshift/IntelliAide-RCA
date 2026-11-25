#!/usr/bin/env bash
# Add (or update) an HTPasswd user for OpenShift + IntelliAide login.
# kubeadmin remains available as the built-in break-glass account.
#
# Usage:
#   ./k8s/add-htpasswd-user.sh myuser 'Strong-Password'
#   MAKE_ADMIN=1 ./k8s/add-htpasswd-user.sh myuser 'Strong-Password'  # append to ADMIN_USERS + rollout API
#
# Env:
#   HTPASSWD_FILE  default: k8s/.must-gather.htpasswd (gitignored)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HTPASSWD_FILE="${HTPASSWD_FILE:-${ROOT_DIR}/k8s/.must-gather.htpasswd}"
SECRET_NAME="${SECRET_NAME:-htpass-secret}"
SECRET_NS="${SECRET_NS:-openshift-config}"
NAMESPACE="${NAMESPACE:-must-gather}"
API_DEPLOY="${ROOT_DIR}/k8s/api-deployment.yaml"

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <username> <password>" >&2
  exit 1
fi

USERNAME="$1"
PASSWORD="$2"

if ! command -v htpasswd >/dev/null 2>&1; then
  echo "ERROR: htpasswd not found (install httpd-tools)." >&2
  exit 1
fi

mkdir -p "$(dirname "${HTPASSWD_FILE}")"
if [[ ! -f "${HTPASSWD_FILE}" ]]; then
  htpasswd -c -B -b "${HTPASSWD_FILE}" "${USERNAME}" "${PASSWORD}"
else
  htpasswd -B -b "${HTPASSWD_FILE}" "${USERNAME}" "${PASSWORD}"
fi

echo "==> Updated local file: ${HTPASSWD_FILE}"

echo "==> Sync secret ${SECRET_NAME} in ${SECRET_NS}"
oc create secret generic "${SECRET_NAME}" \
  --from-file=htpasswd="${HTPASSWD_FILE}" \
  -n "${SECRET_NS}" \
  --dry-run=client -o yaml | oc apply -f -

"${ROOT_DIR}/k8s/setup-htpasswd-idp.sh"

if [[ "${MAKE_ADMIN:-0}" == "1" ]]; then
  if [[ ! -f "${API_DEPLOY}" ]]; then
    echo "WARN: ${API_DEPLOY} not found; skip MAKE_ADMIN" >&2
  else
    CURRENT="$(grep -A1 'name: ADMIN_USERS' "${API_DEPLOY}" | grep 'value:' | sed -E 's/.*value: *"\([^"]*\)".*/\1/' || true)"
    if [[ -z "${CURRENT}" ]]; then
      echo "WARN: Could not parse ADMIN_USERS in ${API_DEPLOY}" >&2
    elif echo ",${CURRENT}," | grep -qi ",${USERNAME},"; then
      echo "==> ${USERNAME} already in ADMIN_USERS"
    else
      NEW_LIST="${CURRENT},${USERNAME}"
      sed -i "s|value: \"${CURRENT}\"|value: \"${NEW_LIST}\"|" "${API_DEPLOY}"
      echo "==> ADMIN_USERS now: ${NEW_LIST}"
      oc apply -f "${API_DEPLOY}"
      oc rollout restart deploy/must-gather-api -n "${NAMESPACE}"
      oc rollout status deploy/must-gather-api -n "${NAMESPACE}" --timeout=120s
    fi
  fi
fi

FRONTEND_HOST="$(oc get route must-gather-frontend-route -n "${NAMESPACE}" -o jsonpath='{.spec.host}' 2>/dev/null || true)"
echo ""
echo "User '${USERNAME}' ready. Log in at OpenShift with that username/password."
echo "kubeadmin still works for cluster break-glass."
if [[ -n "${FRONTEND_HOST}" ]]; then
  echo "App: https://${FRONTEND_HOST}/"
fi
