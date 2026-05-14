import base64
import hashlib
import json
import time
import urllib.error
import urllib.request
from typing import Any, Dict, Optional


class CertdClient:
    def __init__(
        self,
        key_id: str,
        key_secret: str,
        base_url: str = "http://127.0.0.1:7001",
        encrypt: bool = False,
        sign_type: str = "md5",
    ) -> None:
        if not key_id:
            raise ValueError("key_id is required")
        if not key_secret:
            raise ValueError("key_secret is required")
        self.key_id = key_id
        self.key_secret = key_secret
        self.base_url = base_url.rstrip("/")
        self.encrypt = encrypt
        self.sign_type = sign_type

    def get_sign(self, content: str) -> str:
        if self.sign_type != "md5":
            raise ValueError(f"Unsupported sign_type: {self.sign_type}")
        return hashlib.md5((content + self.key_secret).encode("utf-8")).hexdigest()

    def getSign(self, content: str) -> str:
        return self.get_sign(content)

    def get_token(self, encrypt: Optional[bool] = None) -> str:
        content = json.dumps(
            {
                "keyId": self.key_id,
                "t": int(time.time()),
                "encrypt": self.encrypt if encrypt is None else encrypt,
                "signType": self.sign_type,
            },
            separators=(",", ":"),
            ensure_ascii=False,
        )
        sign = self.get_sign(content)
        return (
            base64.b64encode(content.encode("utf-8")).decode("ascii")
            + "."
            + base64.b64encode(sign.encode("utf-8")).decode("ascii")
        )

    def getToken(self, encrypt: Optional[bool] = None) -> str:
        return self.get_token(encrypt)

    def request(self, path: str, body: Optional[Dict[str, Any]] = None, encrypt: Optional[bool] = None) -> str:
        data = json.dumps(body or {}, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        request = urllib.request.Request(
            f"{self.base_url}{path}",
            data=data,
            method="POST",
            headers={
                "content-type": "application/json",
                "x-certd-token": self.get_token(encrypt),
            },
        )

        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return response.read().decode("utf-8")
        except urllib.error.HTTPError as error:
            message = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"HTTP {error.code}: {message}") from error

    def get_cert(self, params: Dict[str, Any]) -> str:
        return self.request("/api/v1/cert/get", params)

    def getCert(self, params: Dict[str, Any]) -> str:
        return self.get_cert(params)
