<?php
/**
 * Vuelos Martín — Copiloto IA Multimodal (Gemini Flash)
 */

require_once __DIR__ . '/trips.php';

function buildCopilotSystemInstruction(): string
{
    return "Sos el Tech Lead y Copiloto de Viajes personal de Martín. Hablás en español rioplatense (uruguayo: 'vos', 'che', 'bo', 'impecable', 'vamo arriba'), directo, práctico, sin rodeos ni servilismos.\n"
        . "Tu misión es actuar como copiloto inteligente para la planificación de sus viajes con análisis multi-destino.\n"
        . "REGLA DE ORO DE DETECCIÓN DE VIAJE NUEVO:\n"
        . "- Si el ESTADO ACTUAL DEL VIAJE está vacío/null, O si Martín sube un billete/reserva de un DESTINO DIFERENTE al actual, O si Martín indica que es un nuevo viaje: DEBES CREAR UN VIAJE NUEVO DESDE CERO para ese nuevo destino. NUNCA mezcles destinos distintos.\n"
        . "- Si Martín está charlando, consultando o ajustando el viaje actual (mismo destino), modificá inteligentemente el itinerario, checklist y hotel según lo que te pida sin duplicar paradas.\n"
        . "Estructura del objeto de viaje (updatedTrip):\n"
        . "- id: 'trip-destino-YYYYMMDD'\n"
        . "- title, destinationCity, destinationCountry, destinationIata, originIata ('BCN'), flag, status ('confirmed'), mode ('daytrip'|'weekend'|'bridge'), dates ({ outbound, inbound }), usefulHours\n"
        . "- flights: { outbound: { airline, flightNumber, originIata, originName, destinationIata, destinationName, departureDate, departureTime, arrivalDate, arrivalTime, terminal, bookingUrl }, inbound: { ... } }\n"
        . "- hotel: { name, address, checkIn, checkOut, price, notes }\n"
        . "- timeline: array ordenado de paradas con { id, day, time, title, desc, category, completed: false }\n"
        . "- checklist: array de cosas esenciales con { id, text, checked: false }\n"
        . "- survivalTips: array de consejos reales y prácticos con { title, icon, desc }\n"
        . "- REGLA DE FECHAS: Si el billete no muestra el año, asumí SIEMPRE el año 2026 o futuro correspondiente.\n"
        . "- REGLA DE PROTECCIÓN DE DATOS CONFIRMADOS: Nunca alteres vuelos u hoteles ya confirmados salvo que Martín envíe una nueva reserva explícita.\n"
        . "- OPTIMIZACIÓN DE VELOCIDAD: Si es solo una pregunta conversacional sin cambios de viaje, devolvé \"updatedTrip\": null.\n"
        . "DEBES RESPONDER EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO:\n"
        . "{\n  \"reply\": \"Tu respuesta directa a Martín.\",\n  \"updatedTrip\": null o { ... }\n}";
}

function formatCopilotHistory(array $history): string
{
    $recent = array_slice($history, -10);
    $lines = [];
    foreach ($recent as $entry) {
        if (!is_array($entry)) {
            continue;
        }
        $role = ($entry['role'] ?? '') === 'model' ? 'Copiloto' : 'Martín';
        $text = trim((string)($entry['text'] ?? ''));
        if ($text !== '') {
            $lines[] = "$role: " . mb_substr($text, 0, 800);
        }
    }
    return empty($lines) ? '' : "\n\nHISTORIAL RECIENTE DE LA CONVERSACIÓN (mantené el hilo):\n" . implode("\n", $lines);
}

function handleTripCopilot(array $env): void
{
    @set_time_limit(120);
    $payload = json_decode(file_get_contents('php://input') ?: '', true) ?: [];
    $userMsg = trim($payload['message'] ?? '');
    $tripState = $payload['trip'] ?? null;
    $fileData = $payload['file'] ?? null;
    $history = is_array($payload['history'] ?? null) ? $payload['history'] : [];

    if (empty($userMsg) && empty($fileData)) {
        echo json_encode(['status' => false, 'message' => 'Mensaje o archivo vacío']);
        return;
    }

    $geminiApiKey = $env['GEMINI_API_KEY'] ?? '';
    if (empty($geminiApiKey)) {
        echo json_encode(['status' => false, 'message' => 'GEMINI_API_KEY no configurada en el servidor.']);
        return;
    }

    $historyBlock = formatCopilotHistory($history);
    $parts = [[
        'text' => buildCopilotSystemInstruction()
            . "\n\nESTADO ACTUAL DEL VIAJE:\n" . json_encode($tripState, JSON_UNESCAPED_UNICODE)
            . $historyBlock
            . "\n\nMENSAJE ACTUAL DE MARTÍN:\n" . ($userMsg ?: 'Analizá el archivo adjunto y armá el viaje con estos datos.')
    ]];

    if (!empty($fileData['data']) && !empty($fileData['mimeType'])) {
        $parts[] = [
            'inline_data' => [
                'mime_type' => $fileData['mimeType'],
                'data' => $fileData['data']
            ]
        ];
    }

    $apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' . urlencode($geminiApiKey);
    $ch = curl_init($apiUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST => 1,
        CURLOPT_POSTFIELDS => json_encode([
            'contents' => [['parts' => $parts]],
            'generationConfig' => [
                'temperature' => 0.3,
                'thinkingConfig' => ['thinkingBudget' => 0]
            ]
        ]),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
        CURLOPT_TIMEOUT => 30,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$response) {
        echo json_encode(['status' => false, 'message' => "Error al contactar a Gemini API (HTTP $httpCode)", 'detail' => $response]);
        return;
    }

    $geminiJson = json_decode($response, true);
    $rawText = $geminiJson['candidates'][0]['content']['parts'][0]['text'] ?? '';
    $cleanText = preg_replace('/^```(?:json)?\s*/i', '', trim($rawText));
    $cleanText = preg_replace('/\s*```$/i', '', $cleanText);

    $parsed = json_decode($cleanText, true);
    if (!$parsed || !isset($parsed['reply'])) {
        echo json_encode([
            'status' => true,
            'reply' => $rawText ?: 'Recibido, pero no pude estructurar el itinerario.',
            'updatedTrip' => $tripState
        ]);
        return;
    }

    $updatedTrip = !empty($parsed['updatedTrip']) ? persistUpdatedTrip($parsed['updatedTrip']) : null;
    echo json_encode([
        'status' => true,
        'reply' => $parsed['reply'],
        'updatedTrip' => $updatedTrip
    ]);
}
