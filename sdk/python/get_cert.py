#!/usr/bin/env python3

import os
import sys

from certd_client import CertdClient


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing environment variable: {name}")
    return value


def bool_env(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return value.lower() in ("1", "true", "yes", "y")


def main() -> None:
    client = CertdClient(
        require_env("CERTD_KEY_ID"),
        require_env("CERTD_KEY_SECRET"),
        base_url=os.getenv("CERTD_BASE_URL", "http://127.0.0.1:7001"),
        encrypt=bool_env("CERTD_ENCRYPT"),
    )

    params = {"autoApply": bool_env("CERTD_AUTO_APPLY")}
    cert_id = os.getenv("CERTD_CERT_ID")
    domains = os.getenv("CERTD_DOMAINS")
    cert_format = os.getenv("CERTD_FORMAT")

    if cert_id:
        params["certId"] = int(cert_id)
    if domains:
        params["domains"] = domains
    if cert_format:
        params["format"] = cert_format
    if "certId" not in params and "domains" not in params:
        raise RuntimeError("Set CERTD_CERT_ID or CERTD_DOMAINS")

    print(client.get_cert(params))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
