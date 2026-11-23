<?php
/**
 * Vuelos Martín — Observabilidad Fail-Safe (Logs JSON + soporte Sentry DSN)
 */

function logStructuredEvent(string $level, string $message, array $context = []): void
{
    try {
        $logDir = __DIR__ . '/../../storage/logs';
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0755, true);
        }
        $entry = [
            'timestamp' => date('c'),
            'level' => $level,
            'service' => 'vuelos-martin-php',
            'message' => $message,
            'context' => $context,
        ];
        @file_put_contents(
            $logDir . '/php_errors.jsonl',
            json_encode($entry, JSON_UNESCAPED_UNICODE) . "\n",
            FILE_APPEND | LOCK_EX
        );
    } catch (\Throwable $e) {
        // Fail-safe: nunca romper la app si falla el log local
    }
}

function initObservability(array $env = []): void
{
    $sentryDsn = $env['SENTRY_DSN'] ?? (getenv('SENTRY_DSN') ?: '');

    set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
        if (!(error_reporting() & $severity)) {
            return false;
        }
        logStructuredEvent('warning', $message, ['file' => basename($file), 'line' => $line, 'severity' => $severity]);
        return false;
    });

    set_exception_handler(static function (\Throwable $e) use ($sentryDsn): void {
        logStructuredEvent('error', $e->getMessage(), [
            'exception' => get_class($e),
            'file' => basename($e->getFile()),
            'line' => $e->getLine(),
            'sentryConfigured' => !empty($sentryDsn),
        ]);
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json; charset=UTF-8');
        }
        echo json_encode(['status' => false, 'message' => 'Error interno del servidor.']);
        exit;
    });
}
