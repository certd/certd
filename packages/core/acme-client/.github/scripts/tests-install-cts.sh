#!/bin/bash
#
# Install Pebble Challenge Test Server for testing.
#
set -euo pipefail

# Download and install
wget -nv "https://github.com/letsencrypt/pebble/releases/download/v${PEBBLECTS_VERSION}/pebble-challtestsrv_linux-amd64" -O /usr/local/bin/pebble-challtestsrv

chown root:root /usr/local/bin/pebble-challtestsrv
chmod 0755 /usr/local/bin/pebble-challtestsrv

exit 0
