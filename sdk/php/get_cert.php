<?php

require_once __DIR__ . '/CertdClient.php';

function require_env(string $name): string
{
    $value = getenv($name);
    if ($value === false || $value === '') {
        throw new RuntimeException("Missing environment variable: {$name}");
    }
    return $value;
}

function bool_env(string $name, bool $default = false): bool
{
    $value = getenv($name);
    if ($value === false || $value === '') {
        return $default;
    }
    return in_array(strtolower($value), ['1', 'true', 'yes', 'y'], true);
}

try {
    $client = new CertdClient(require_env('CERTD_KEY_ID'), require_env('CERTD_KEY_SECRET'), [
        'baseUrl' => getenv('CERTD_BASE_URL') ?: 'http://127.0.0.1:7001',
        'encrypt' => bool_env('CERTD_ENCRYPT'),
    ]);

    $params = [
        'autoApply' => bool_env('CERTD_AUTO_APPLY'),
    ];
    if (getenv('CERTD_CERT_ID')) {
        if (!ctype_digit(getenv('CERTD_CERT_ID'))) {
            throw new RuntimeException('CERTD_CERT_ID must be a positive integer');
        }
        $params['certId'] = intval(getenv('CERTD_CERT_ID'));
    }
    if (getenv('CERTD_DOMAINS')) {
        $params['domains'] = getenv('CERTD_DOMAINS');
    }
    if (getenv('CERTD_FORMAT')) {
        $params['format'] = getenv('CERTD_FORMAT');
    }
    if (empty($params['certId']) && empty($params['domains'])) {
        throw new RuntimeException('Set CERTD_CERT_ID or CERTD_DOMAINS');
    }

    echo $client->getCert($params) . PHP_EOL;
} catch (Throwable $e) {
    fwrite(STDERR, $e->getMessage() . PHP_EOL);
    exit(1);
}
