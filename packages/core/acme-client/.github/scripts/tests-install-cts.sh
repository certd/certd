#!/bin/bash
#
# Install Pebble Challenge Test Server for testing.
#
set -euo pipefail

# Download and install
wget -nv "https://github.com/letsencrypt/pebble/releases/download/v${PEBBLECTS_VERSION}/pebble-challtestsrv-linux-amd64.tar.gz" -O /tmp/pebble-challtestsrv.tar.gz
tar zxvf /tmp/pebble-challtestsrv.tar.gz -C /tmp

mv /tmp/pebble-challtestsrv-linux-amd64/linux/amd64/pebble-challtestsrv /usr/local/bin/pebble-challtestsrv
chown root:root /usr/local/bin/pebble-challtestsrv
chmod 0755 /usr/local/bin/pebble-challtestsrv

exit 0
