#!/bin/bash
#
# Wait for ACME server to accept connections.
#
set -euo pipefail

MAX_ATTEMPTS=15
ATTEMPT=0

# Loop until ready
while ! curl --cacert "${ACME_CA_CERT_PATH}" -s -D - "${ACME_DIRECTORY_URL}" | grep '^HTTP.*200' > /dev/null 2>&1; do
    ATTEMPT=$((ATTEMPT + 1))

    # Max attempts
    if [[ $ATTEMPT -gt $MAX_ATTEMPTS ]]; then
        echo "[!] Waited ${ATTEMPT} attempts for server to become ready, exit 1"
        exit 1
    fi

    # Retry
    echo "[-] Waiting 1 second for server to become ready, attempt: ${ATTEMPT}/${MAX_ATTEMPTS}, check: ${ACME_DIRECTORY_URL}, cert: ${ACME_CA_CERT_PATH}"
    sleep 1
done

# Ready
echo "[+] Server ready!"
exit 0
