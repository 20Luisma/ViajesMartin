<?php
/**
 * Vuelos Martín — API Router
 * Despacha acciones a módulos desacoplados en public/api/
 */

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/api/env.php';
require_once __DIR__ . '/api/observability.php';

$env = loadApiEnv();
initObservability($env);
auth_require(true); // Devuelve 401 JSON si no hay sesión activa

header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');

$action = $_GET['action'] ?? ($argv[1] ?? (php_sapi_name() === 'cli' ? 'scan' : ''));

switch ($action) {
    case 'get_trips':
        require_once __DIR__ . '/api/trips.php';
        handleGetTrips();
        break;
    case 'save_trip':
        require_once __DIR__ . '/api/trips.php';
        handleSaveTrip();
        break;
    case 'trip_copilot':
        require_once __DIR__ . '/api/copilot.php';
        handleTripCopilot($env);
        break;
    case 'send_telegram':
        require_once __DIR__ . '/api/telegram.php';
        handleSendTelegram($env);
        break;
    case 'scan':
        require_once __DIR__ . '/api/scan.php';
        handleScan($env);
        break;
    case 'status':
        $dealsPath = __DIR__ . '/data/deals.json';
        $updatedAt = file_exists($dealsPath) ? date('c', filemtime($dealsPath)) : null;
        echo json_encode(['status' => true, 'updatedAt' => $updatedAt]);
        break;
    default:
        echo json_encode(['status' => false, 'message' => 'Acción no válida.']);
        break;
}
