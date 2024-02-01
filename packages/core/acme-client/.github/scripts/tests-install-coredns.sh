#!/bin/bash
#
# Install CoreDNS for testing.
#
set -euo pipefail

# Download and install
wget -nv "https://github.com/coredns/coredns/releases/download/v${COREDNS_VERSION}/coredns_${COREDNS_VERSION}_linux_amd64.tgz" -O /tmp/coredns.tgz

tar zxvf /tmp/coredns.tgz -C /usr/local/bin
chown root:root /usr/local/bin/coredns
chmod 0755 /usr/local/bin/coredns

mkdir -p /etc/coredns

# Zones
tee /etc/coredns/db.example.com << EOF
\$ORIGIN example.com.
@       3600 IN SOA ns.coredns.invalid. master.coredns.invalid. (
                                2017042745  ; serial
                                7200        ; refresh
                                3600        ; retry
                                1209600     ; expire
                                3600        ; minimum
                                )

        3600 IN NS ns1.example.com.
        3600 IN NS ns2.example.com.

ns1     3600 IN A 127.0.0.1
ns2     3600 IN A 127.0.0.1

@       3600 IN A 127.0.0.1
www     3600 IN CNAME example.com.
EOF

# Config
tee /etc/coredns/Corefile << EOF
example.com {
    errors
    log
    bind 127.53.53.53
    file /etc/coredns/db.example.com
}

test.example.com {
    errors
    log
    bind 127.53.53.53
    forward . 127.0.0.1:${PEBBLECTS_DNS_PORT}
}

. {
    errors
    log
    bind 127.53.53.53
    forward . 8.8.8.8
}
EOF

exit 0
