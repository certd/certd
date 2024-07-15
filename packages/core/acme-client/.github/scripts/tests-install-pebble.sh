#!/bin/bash
#
# Install Pebble for testing.
#
set -euo pipefail

CONFIG_NAME="pebble-config.json"

# Use Pebble EAB config if enabled
set +u
if [[ -n $ACME_CAP_EAB_ENABLED ]] && [[ $ACME_CAP_EAB_ENABLED -eq 1 ]]; then
    CONFIG_NAME="pebble-config-external-account-bindings.json"
fi
set -u

# Download certs and config
mkdir -p /etc/pebble

wget -nv "https://raw.githubusercontent.com/letsencrypt/pebble/v${PEBBLE_VERSION}/test/certs/pebble.minica.pem" -O /etc/pebble/ca.cert.pem
wget -nv "https://raw.githubusercontent.com/letsencrypt/pebble/v${PEBBLE_VERSION}/test/certs/localhost/cert.pem" -O /etc/pebble/cert.pem
wget -nv "https://raw.githubusercontent.com/letsencrypt/pebble/v${PEBBLE_VERSION}/test/certs/localhost/key.pem" -O /etc/pebble/key.pem
wget -nv "https://raw.githubusercontent.com/letsencrypt/pebble/v${PEBBLE_VERSION}/test/config/${CONFIG_NAME}" -O /etc/pebble/pebble.json

# Download and install Pebble
wget -nv "https://github.com/letsencrypt/pebble/releases/download/v${PEBBLE_VERSION}/pebble-linux-amd64.tar.gz" -O /tmp/pebble.tar.gz
tar zxvf /tmp/pebble.tar.gz -C /tmp

mv /tmp/pebble-linux-amd64/linux/amd64/pebble /usr/local/bin/pebble
chown root:root /usr/local/bin/pebble
chmod 0755 /usr/local/bin/pebble

# Config
sed -i 's#test/certs/localhost#/etc/pebble#' /etc/pebble/pebble.json

exit 0
