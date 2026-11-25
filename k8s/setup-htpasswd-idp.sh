#!/usr/bin/env bash
# Enable HTPasswd identity provider on the cluster (one-time).
# kubeadmin continues to work — it is separate from identityProviders.
#
# Requires: cluster-admin, htpass-secret in openshift-config (run add-htpasswd-user.sh first).
#
# Usage:
#   ./k8s/setup-htpasswd-idp.sh

set -euo pipefail

IDP_NAME="${IDP_NAME:-htpasswd_provider}"
SECRET_NAME="${SECRET_NAME:-htpass-secret}"
SECRET_NS="${SECRET_NS:-openshift-config}"

if ! oc get secret "${SECRET_NAME}" -n "${SECRET_NS}" >/dev/null 2>&1; then
  echo "ERROR: Secret ${SECRET_NAME} not found in ${SECRET_NS}." >&2
  echo "Create at least one user first: ./k8s/add-htpasswd-user.sh <username> <password>" >&2
  exit 1
fi

if oc get oauth cluster -o json | jq -e --arg n "${IDP_NAME}" \
  '.spec.identityProviders // [] | any(.name == $n)' >/dev/null; then
  echo "HTPasswd provider '${IDP_NAME}' already configured on oauth/cluster."
  exit 0
fi

NEW_IDP="$(jq -n \
  --arg name "${IDP_NAME}" \
  --arg secret "${SECRET_NAME}" \
  '{
    name: $name,
    mappingMethod: "claim",
    type: "HTPasswd",
    htpasswd: { fileData: { name: $secret } }
  }')"

echo "==> Adding HTPasswd provider '${IDP_NAME}' (kubeadmin login unchanged)"
TMP="$(mktemp)"
oc get oauth cluster -o json | jq --argjson idp "${NEW_IDP}" '
  .spec.identityProviders = (.spec.identityProviders // []) + [$idp]
' > "${TMP}"
oc replace -f "${TMP}"
rm -f "${TMP}"

echo "==> Done. Wait ~1–2 minutes, then log in with HTPasswd users or kubeadmin."
