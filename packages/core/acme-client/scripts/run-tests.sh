#!/bin/bash
#
# Run test suite locally using CircleCI CLI.
#
set -eu

JOBS=("$@")

CIRCLECI_CLI_URL="https://github.com/CircleCI-Public/circleci-cli/releases/download/v0.1.29936/circleci-cli_0.1.29936_linux_amd64.tar.gz"
CIRCLECI_CLI_SHASUM="fdc8da76111facae4a10f3717502eeb5d78db0256ef94a2f8d53078978175d40"
CIRCLECI_CLI_PATH="/tmp/circleci-cli"
CIRCLECI_CLI_BIN="${CIRCLECI_CLI_PATH}/circleci"

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && cd .. && pwd )"
CONFIG_PATH="${PROJECT_DIR}/.circleci/.temp.yml"

# Run all jobs by default
if [[ ${#JOBS[@]} -eq 0 ]]; then
    JOBS=(
        "v16"
        "v18"
        "v20"
        "eab-v16"
        "eab-v18"
        "eab-v20"
    )
fi

# Download CircleCI CLI
if [[ ! -f "${CIRCLECI_CLI_BIN}" ]]; then
    echo "[-] Downloading CircleCI cli"
    mkdir -p "${CIRCLECI_CLI_PATH}"
    wget -nv "${CIRCLECI_CLI_URL}" -O "${CIRCLECI_CLI_PATH}/circleci-cli.tar.gz"
    echo "${CIRCLECI_CLI_SHASUM} *${CIRCLECI_CLI_PATH}/circleci-cli.tar.gz" | sha256sum -c
    tar zxvf "${CIRCLECI_CLI_PATH}/circleci-cli.tar.gz" -C "${CIRCLECI_CLI_PATH}" --strip-components=1
fi

# Disable CircleCI update checks and telemetry
export CIRCLECI_CLI_SKIP_UPDATE_CHECK="true"
export CIRCLECI_CLI_TELEMETRY_OPTOUT="1"

# Run test suite
echo "[-] Running test suite"
$CIRCLECI_CLI_BIN config process "${PROJECT_DIR}/.circleci/config.yml" > "${CONFIG_PATH}"
$CIRCLECI_CLI_BIN config validate -c "${CONFIG_PATH}"

for job in "${JOBS[@]}"; do
    echo "[-] Running job: ${job}"
    $CIRCLECI_CLI_BIN local execute -c "${CONFIG_PATH}" "${job}"
    echo "[+] ${job} completed successfully"
done

# Clean up
if [[ -f "${CONFIG_PATH}" ]]; then
    rm "${CONFIG_PATH}"
fi

echo "[+] Test suite ran successfully!"
exit 0
