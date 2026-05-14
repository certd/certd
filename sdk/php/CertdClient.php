<?php

class CertdClient
{
    private string $keyId;
    private string $keySecret;
    private string $baseUrl;
    private bool $encrypt;
    private string $signType;

    public function __construct(string $keyId, string $keySecret, array $options = [])
    {
        if ($keyId === '') {
            throw new InvalidArgumentException('keyId is required');
        }
        if ($keySecret === '') {
            throw new InvalidArgumentException('keySecret is required');
        }
        $this->keyId = $keyId;
        $this->keySecret = $keySecret;
        $this->baseUrl = rtrim($options['baseUrl'] ?? 'http://127.0.0.1:7001', '/');
        $this->encrypt = $options['encrypt'] ?? false;
        $this->signType = $options['signType'] ?? 'md5';
    }

    public function getSign(string $content): string
    {
        if ($this->signType !== 'md5') {
            throw new InvalidArgumentException("Unsupported signType: {$this->signType}");
        }
        return md5($content . $this->keySecret);
    }

    public function getToken(?bool $encrypt = null): string
    {
        $content = json_encode([
            'keyId' => $this->keyId,
            't' => time(),
            'encrypt' => $encrypt ?? $this->encrypt,
            'signType' => $this->signType,
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $sign = $this->getSign($content);
        return base64_encode($content) . '.' . base64_encode($sign);
    }

    public function request(string $path, array $body = [], ?bool $encrypt = null): string
    {
        if (!function_exists('curl_init')) {
            throw new RuntimeException('PHP curl extension is required');
        }

        $payload = json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $headers = [
            'Content-Type: application/json',
            'x-certd-token: ' . $this->getToken($encrypt),
        ];

        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60,
        ]);

        $response = curl_exec($ch);
        if ($response === false) {
            throw new RuntimeException(curl_error($ch));
        }
        $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($statusCode < 200 || $statusCode >= 300) {
            throw new RuntimeException("HTTP {$statusCode}: {$response}");
        }
        return $response;
    }

    public function getCert(array $params): string
    {
        return $this->request('/api/v1/cert/get', $params);
    }
}
