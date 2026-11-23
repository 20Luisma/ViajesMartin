<?php
/**
 * Vuelos Martín — Cargador de variables de entorno (.env + getenv)
 */

function loadApiEnv(): array
{
    $env = [
        'TELEGRAM_BOT_TOKEN' => '',
        'TELEGRAM_CHAT_ID' => '',
        'RAPIDAPI_KEY' => '',
        'GEMINI_API_KEY' => '',
        'SENTRY_DSN' => '',
    ];

    $envFile = file_exists(__DIR__ . '/../.env') ? __DIR__ . '/../.env' : __DIR__ . '/../../.env';
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0 || strpos($line, '=') === false) {
                continue;
            }
            [$key, $val] = explode('=', $line, 2);
            $key = trim($key);
            if (array_key_exists($key, $env)) {
                $env[$key] = trim($val, " \t\n\r\0\x0B\"'");
            }
        }
    }

    foreach ($env as $key => $val) {
        if (empty($val)) {
            $env[$key] = getenv($key) ?: '';
        }
    }

    return $env;
}
