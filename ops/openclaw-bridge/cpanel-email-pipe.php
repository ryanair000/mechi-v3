#!/usr/bin/env php
<?php
declare(strict_types=1);

/*
 * cPanel pipe-to-program adapter for Mechi OpenClaw email intake.
 *
 * Deploy this outside public_html and configure a cPanel forwarder such as:
 * |/usr/local/bin/php -q /home/vawxwkah/openclaw-mail-pipe.php info@mechi.club
 *
 * Keep the token in a sibling config file, never in the repository:
 *   /home/vawxwkah/openclaw-mail-pipe.config.php
 */

$configPath = getenv('MECHI_MAIL_PIPE_CONFIG') ?: __DIR__ . '/openclaw-mail-pipe.config.php';
$config = is_readable($configPath) ? require $configPath : [];
if (!is_array($config)) {
    $config = [];
}

$bridgeUrl = trim((string)(($config['bridge_url'] ?? null) ?: getenv('MECHI_OPENCLAW_EMAIL_BRIDGE_URL')));
if ($bridgeUrl === '') {
    $bridgeUrl = 'https://smm-api.lokimax.top/webhooks/email';
}
$bridgeToken = trim((string)(($config['bridge_token'] ?? null) ?: getenv('MECHI_OPENCLAW_BRIDGE_TOKEN')));
$logPath = (string)($config['log_path'] ?? __DIR__ . '/openclaw-mail-pipe.log');
$sourceAccount = trim((string)($argv[1] ?? $config['source_account'] ?? ''));
$maxRawBytes = (int)($config['max_raw_bytes'] ?? 1048576);

function pipe_log(string $path, string $message): void
{
    $line = sprintf("[%s] %s\n", gmdate('c'), $message);
    @file_put_contents($path, $line, FILE_APPEND | LOCK_EX);
}

function unfold_headers(string $headersText): array
{
    $headers = [];
    $current = null;
    foreach (preg_split("/\r\n|\n|\r/", $headersText) ?: [] as $line) {
        if ($line === '') {
            continue;
        }
        if (($line[0] === ' ' || $line[0] === "\t") && $current !== null) {
            $headers[$current] .= ' ' . trim($line);
            continue;
        }
        $pos = strpos($line, ':');
        if ($pos === false) {
            continue;
        }
        $name = strtolower(trim(substr($line, 0, $pos)));
        $value = trim(substr($line, $pos + 1));
        if ($name === '') {
            continue;
        }
        $current = $name;
        $decoded = function_exists('iconv_mime_decode')
            ? @iconv_mime_decode($value, ICONV_MIME_DECODE_CONTINUE_ON_ERROR, 'UTF-8')
            : false;
        $headers[$name] = $decoded !== false ? $decoded : $value;
    }

    return $headers;
}

function split_raw_message(string $raw): array
{
    $parts = preg_split("/\r\n\r\n|\n\n|\r\r/", $raw, 2);
    return [
        $parts[0] ?? '',
        $parts[1] ?? '',
    ];
}

function decode_body(string $body, string $encoding): string
{
    $encoding = strtolower(trim($encoding));
    if ($encoding === 'base64') {
        $decoded = base64_decode(preg_replace('/\s+/', '', $body) ?? '', true);
        return $decoded !== false ? $decoded : $body;
    }
    if ($encoding === 'quoted-printable') {
        return quoted_printable_decode($body);
    }

    return $body;
}

function header_param(string $header, string $param): string
{
    if (preg_match('/(?:^|;)\s*' . preg_quote($param, '/') . '="?([^";]+)"?/i', $header, $matches)) {
        return trim($matches[1]);
    }

    return '';
}

function extract_text_body(array $headers, string $body): array
{
    $contentType = strtolower((string)($headers['content-type'] ?? 'text/plain'));
    $encoding = (string)($headers['content-transfer-encoding'] ?? '');
    $boundary = header_param((string)($headers['content-type'] ?? ''), 'boundary');

    if ($boundary !== '') {
        $plain = '';
        $html = '';
        $chunks = preg_split('/--' . preg_quote($boundary, '/') . '(?:--)?\s*/', $body) ?: [];
        foreach ($chunks as $chunk) {
            $chunk = trim($chunk);
            if ($chunk === '') {
                continue;
            }
            [$partHeaderText, $partBody] = split_raw_message($chunk);
            $partHeaders = unfold_headers($partHeaderText);
            $partType = strtolower((string)($partHeaders['content-type'] ?? 'text/plain'));
            $partEncoding = (string)($partHeaders['content-transfer-encoding'] ?? '');
            $decoded = trim(decode_body($partBody, $partEncoding));
            if ($decoded === '') {
                continue;
            }
            if (strpos($partType, 'text/plain') !== false && $plain === '') {
                $plain = $decoded;
            } elseif (strpos($partType, 'text/html') !== false && $html === '') {
                $html = trim(strip_tags($decoded));
            }
        }

        return [
            'text' => $plain !== '' ? $plain : $html,
            'html' => $html,
        ];
    }

    $decoded = trim(decode_body($body, $encoding));
    if (strpos($contentType, 'text/html') !== false) {
        return [
            'text' => trim(strip_tags($decoded)),
            'html' => $decoded,
        ];
    }

    return [
        'text' => $decoded,
        'html' => '',
    ];
}

function post_json(string $url, string $token, array $payload): array
{
    $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        return [false, 0, 'Could not encode payload'];
    }

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $token,
            ],
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 180,
        ]);
        $body = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        return [$status >= 200 && $status < 300, $status, $error !== '' ? $error : (string)$body];
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $token,
            ]),
            'content' => $json,
            'timeout' => 180,
            'ignore_errors' => true,
        ],
    ]);
    $body = @file_get_contents($url, false, $context);
    $status = 0;
    foreach (($http_response_header ?? []) as $header) {
        if (preg_match('/^HTTP\/\S+\s+(\d+)/', $header, $matches)) {
            $status = (int)$matches[1];
            break;
        }
    }

    return [$status >= 200 && $status < 300, $status, (string)$body];
}

$raw = file_get_contents('php://stdin');
if ($raw === false || $raw === '') {
    pipe_log($logPath, 'No message received on stdin');
    exit(0);
}

if (strlen($raw) > $maxRawBytes) {
    $raw = substr($raw, 0, $maxRawBytes);
}

if ($bridgeToken === '') {
    pipe_log($logPath, 'Missing bridge token; message not forwarded');
    exit(0);
}

[$headersText, $body] = split_raw_message($raw);
$headers = unfold_headers($headersText);
$bodyParts = extract_text_body($headers, $body);

$payload = [
    'source_account' => $sourceAccount !== '' ? $sourceAccount : ($headers['delivered-to'] ?? $headers['x-original-to'] ?? ''),
    'message_id' => $headers['message-id'] ?? '',
    'from' => $headers['from'] ?? '',
    'reply_to' => $headers['reply-to'] ?? '',
    'to' => $headers['to'] ?? '',
    'cc' => $headers['cc'] ?? '',
    'subject' => $headers['subject'] ?? '',
    'received_at' => $headers['date'] ?? gmdate('c'),
    'text' => $bodyParts['text'],
    'html' => $bodyParts['html'],
    'headers' => $headers,
    'raw_size_bytes' => strlen($raw),
];

[$ok, $status, $responseText] = post_json($bridgeUrl, $bridgeToken, $payload);
pipe_log(
    $logPath,
    sprintf(
        'forwarded=%s status=%d source=%s message_id=%s response=%s',
        $ok ? 'yes' : 'no',
        $status,
        $payload['source_account'],
        $payload['message_id'],
        substr(str_replace(["\r", "\n"], ' ', $responseText), 0, 500)
    )
);

exit(0);
