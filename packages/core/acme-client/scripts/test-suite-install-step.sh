#!/bin/bash
#
# Install and init step-ca for testing.
#
set -eu

# Download and install
wget -nv "https://dl.step.sm/gh-release/certificates/gh-release-header/v${STEPCA_VERSION}/step-ca_${STEPCA_VERSION}_amd64.deb" -O /tmp/step-ca.deb
wget -nv "https://dl.step.sm/gh-release/cli/gh-release-header/v${STEPCLI_VERSION}/step-cli_${STEPCLI_VERSION}_amd64.deb" -O /tmp/step-cli.deb

sudo dpkg -i /tmp/step-ca.deb
sudo dpkg -i /tmp/step-cli.deb

# Initialize
echo "hunter2" > /tmp/password

step ca init --name="Example Inc." --dns="localhost" --address="127.0.0.1:8443" --provisioner="test@example.com" --password-file="/tmp/password"
step ca provisioner add acme --type ACME

exit 0
