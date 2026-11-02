<?php
/**
 * Vuelos Martín — API Endpoint
 * Soporta reenvío a Telegram de ofertas puntuales y consulta de estado
 */

header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');

// Cargar variables de .env si existe
$envFile = file_exists(__DIR__ . '/.env') ? __DIR__ . '/.env' : __DIR__ . '/../.env';
$botToken = '';
$chatId = '';
$rapidApiKey = '';
$geminiApiKey = '';

if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $val) = explode('=', $line, 2);
            $key = trim($key);
            $val = trim($val, " \t\n\r\0\x0B\"'");
            if ($key === 'TELEGRAM_BOT_TOKEN') $botToken = $val;
            if ($key === 'TELEGRAM_CHAT_ID') $chatId = $val;
            if ($key === 'RAPIDAPI_KEY') $rapidApiKey = $val;
            if ($key === 'GEMINI_API_KEY') $geminiApiKey = $val;
        }
    }
}

// Carga desde variables de entorno del sistema
if (empty($botToken)) $botToken = getenv('TELEGRAM_BOT_TOKEN') ?: '';
if (empty($chatId)) $chatId = getenv('TELEGRAM_CHAT_ID') ?: '';
if (empty($rapidApiKey)) $rapidApiKey = getenv('RAPIDAPI_KEY') ?: '';
if (empty($geminiApiKey)) $geminiApiKey = getenv('GEMINI_API_KEY') ?: '';

$action = $_GET['action'] ?? ($argv[1] ?? (php_sapi_name() === 'cli' ? 'scan' : ''));

if ($action === 'get_trips') {
    $tripsFile = __DIR__ . '/data/trips.json';
    if (file_exists($tripsFile)) {
        echo file_get_contents($tripsFile);
    } else {
        echo json_encode(['activeTripId' => '', 'trips' => []]);
    }
    exit;
}

if ($action === 'save_trip') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    if (!$data) {
        echo json_encode(['status' => false, 'message' => 'JSON inválido']);
        exit;
    }
    $tripsFile = __DIR__ . '/data/trips.json';
    file_put_contents($tripsFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(['status' => true, 'message' => 'Viaje guardado correctamente']);
    exit;
}

if ($action === 'trip_copilot') {
    @set_time_limit(120);
    $rawInput = file_get_contents('php://input');
    $payload = json_decode($rawInput, true);
    $userMsg = trim($payload['message'] ?? '');
    $tripState = $payload['trip'] ?? null;
    $fileData = $payload['file'] ?? null;

    if (empty($userMsg) && empty($fileData)) {
        echo json_encode(['status' => false, 'message' => 'Mensaje o archivo vacío']);
        exit;
    }

    if (empty($geminiApiKey)) {
        echo json_encode(['status' => false, 'message' => 'GEMINI_API_KEY no configurada en el servidor.']);
        exit;
    }

    $systemInstruction = "Sos el Tech Lead y Copiloto de Viajes personal de Martín. Hablás en español rioplatense (uruguayo: 'vos', 'che', 'bo', 'impecable', 'vamo arriba'), directo, práctico, sin rodeos ni servilismos.\n"
        . "Tu misión es actuar como copiloto inteligente para la planificación de sus viajes con análisis multi-destino.\n"
        . "REGLA DE ORO DE DETECCIÓN DE VIAJE NUEVO:\n"
        . "- Si el ESTADO ACTUAL DEL VIAJE está vacío/null, O si Martín sube un billete/reserva de un DESTINO DIFERENTE al actual (ej: China, Pekín, Roma, Tokio o cualquier otra ciudad distinta al viaje cargado), O si Martín indica que es un nuevo viaje: DEBES CREAR UN VIAJE NUEVO DESDE CERO para ese nuevo destino. NUNCA mezcles destinos distintos ni fuerces paradas de un destino anterior dentro de una nueva ciudad.\n"
        . "- Si Martín está charlando, consultando o ajustando el viaje actual (mismo destino), modificá inteligentemente el itinerario, checklist y hotel según lo que te pida sin duplicar paradas.\n"
        . "Estructura del objeto de viaje (updatedTrip):\n"
        . "- id: 'trip-destino-YYYYMMDD'\n"
        . "- title, destinationCity, destinationCountry, destinationIata, originIata ('BCN'), flag (emoji de bandera del país de destino), status ('confirmed'), mode ('daytrip'|'weekend'|'bridge'), dates ({ outbound, inbound }), usefulHours\n"
        . "- flights: { outbound: { airline, flightNumber, originIata, originName, destinationIata, destinationName, departureDate, departureTime, arrivalDate, arrivalTime, terminal, bookingUrl }, inbound: { ... } }\n"
        . "- hotel: { name, address, checkIn, checkOut, price, notes }\n"
        . "- timeline: array ordenado de paradas con { id, day, time, title, desc, category, completed: false }\n"
        . "- checklist: array de cosas esenciales para ese destino concreto con { id, text, checked: false }\n"
        . "- survivalTips: array de consejos reales y prácticos de ese destino específico con { title, icon, desc }\n"
        . "- REGLA DE FECHAS: Los billetes de aerolínea (como Ryanair) a menudo no muestran el año (ej: '25 NOV'). Debes asumir SIEMPRE el año 2026 (o el año futuro correspondiente), NUNCA fechas pasadas como 2024 o 2025.\n"
        . "- REGLA DE PROTECCIÓN DE DATOS CONFIRMADOS: Si ya existe un viaje activo con vuelos o alojamiento confirmados (ej: vuelos Ryanair FR3189/FR3188 o hotel 'Dar Berrada-Ziat'), TIENES TERMINANTEMENTE PROHIBIDO cambiarlos, inventar otros nombres de riad (como Dar Mfaddel o Dar Bensouda) o alterar fechas de vuelo. Los datos confirmados son sagrados y solo se modifican si Martín envía explícitamente una nueva reserva o billete.\n"
        . "- OPTIMIZACIÓN DE VELOCIDAD:\n"
        . "  * Si Martín hace una PREGUNTA CONVERSACIONAL, duda o pide tips (ej: sobre mapas, consejos, qué ver, comida, etc.) y NO requiere cambiar datos de vuelos ni paradas: responde al pie en 'reply' y pon \"updatedTrip\": null.\n"
        . "  * Solo incluye \"updatedTrip\" con el objeto completo si se está creando un viaje nuevo o modificando vuelos/hotel/itinerario.\n"
        . "DEBES RESPONDER EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO con esta estructura exacta:\n"
        . "{\n"
        . "  \"reply\": \"Tu respuesta conversacional directa a Martín explicando qué hiciste y dándole piques técnicos.\",\n"
        . "  \"updatedTrip\": null o { ... objeto del viaje creado o actualizado ... }\n"
        . "}";

    $parts = [];
    $parts[] = ["text" => $systemInstruction . "\n\nESTADO ACTUAL DEL VIAJE:\n" . json_encode($tripState, JSON_UNESCAPED_UNICODE) . "\n\nMENSAJE DE MARTÍN:\n" . ($userMsg ?: "Analizá el archivo adjunto y armá el viaje con estos datos.")];

    if (!empty($fileData['data']) && !empty($fileData['mimeType'])) {
        $parts[] = [
            "inline_data" => [
                "mime_type" => $fileData['mimeType'],
                "data" => $fileData['data']
            ]
        ];
    }

    $apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" . urlencode($geminiApiKey);

    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        "contents" => [
            ["parts" => $parts]
        ],
        "generationConfig" => [
            "temperature" => 0.3,
            "thinkingConfig" => [
                "thinkingBudget" => 0
            ]
        ]
    ]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$response) {
        echo json_encode(['status' => false, 'message' => "Error al contactar a Gemini API (HTTP $httpCode)", 'detail' => $response]);
        exit;
    }

    $geminiJson = json_decode($response, true);
    $rawText = $geminiJson['candidates'][0]['content']['parts'][0]['text'] ?? '';
    
    // Limpieza de formato markdown si viniera
    $cleanText = preg_replace('/^```(?:json)?\s*/i', '', trim($rawText));
    $cleanText = preg_replace('/\s*```$/i', '', $cleanText);

    $parsed = json_decode($cleanText, true);
    if (!$parsed || !isset($parsed['reply'])) {
        echo json_encode(['status' => true, 'reply' => $rawText ?: 'Recibido, pero no pude estructurar el itinerario.', 'updatedTrip' => $tripState]);
        exit;
    }

    // Persistir el viaje actualizado en disco
    if (!empty($parsed['updatedTrip'])) {
        $tripsFile = __DIR__ . '/data/trips.json';
        if (file_exists($tripsFile)) {
            @copy($tripsFile, __DIR__ . '/data/trips_backup.json');
        }
        $allTrips = file_exists($tripsFile) ? (json_decode(file_get_contents($tripsFile), true) ?: ['activeTripId' => '', 'trips' => []]) : ['activeTripId' => '', 'trips' => []];
        $newTripId = $parsed['updatedTrip']['id'] ?? ('trip_' . time());
        $parsed['updatedTrip']['id'] = $newTripId;
        
        $found = false;
        foreach ($allTrips['trips'] as &$t) {
            if (($t['id'] ?? '') === $newTripId) {
                $t = $parsed['updatedTrip'];
                $found = true;
                break;
            }
        }
        if (!$found) {
            $allTrips['trips'][] = $parsed['updatedTrip'];
        }
        $allTrips['activeTripId'] = $newTripId;
        file_put_contents($tripsFile, json_encode($allTrips, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    echo json_encode([
        'status' => true,
        'reply' => $parsed['reply'],
        'updatedTrip' => !empty($parsed['updatedTrip']) ? $parsed['updatedTrip'] : null
    ]);
    exit;
}

if ($action === 'send_telegram') {
    $iata = htmlspecialchars($_GET['iata'] ?? 'BCN');
    $city = htmlspecialchars($_GET['city'] ?? $iata);
    $price = htmlspecialchars($_GET['price'] ?? '0');
    $hours = htmlspecialchars($_GET['hours'] ?? '0');
    $mode = htmlspecialchars($_GET['mode'] ?? 'daytrip');
    $airline = htmlspecialchars($_GET['airline'] ?? 'Aerolínea');
    $url = $_GET['url'] ?? 'https://www.ryanair.com';

    $modeTitle = ($mode === 'daytrip') 
        ? '⚡ EXPRESS DAY-TRIP (En el día • 0 € Hotel)' 
        : (($mode === 'weekend') ? '🎒 FINDE RELÁMPAGO (1 Noche)' : '🌉 ESCAPADA 2 NOCHES');

    $message = "🚨 *{$modeTitle}*\n\n"
             . "✈️ *BCN ➔ {$city} ({$iata})*\n"
             . "🏢 *Compañía:* {$airline}\n\n"
             . "⏱️ *Tiempo útil en destino:* {$hours} horas\n"
             . "💶 *Precio Total i/v:* *{$price} €*\n\n"
             . "🔗 [Reservar Vuelo Ahora]({$url})";

    $tgUrl = "https://api.telegram.org/bot{$botToken}/sendMessage";
    $payload = [
        'chat_id' => $chatId,
        'text' => $message,
        'parse_mode' => 'Markdown',
        'disable_web_page_preview' => false
    ];

    $ch = curl_init($tgUrl);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200) {
        echo json_encode(['status' => true, 'message' => '¡Vuelo enviado a tu Telegram!']);
    } else {
        echo json_encode(['status' => false, 'message' => 'Error al contactar a Telegram.', 'detail' => $result]);
    }
    exit;
}

if ($action === 'scan') {
    $customMaxPrice = !empty($_GET['max_price']) ? floatval($_GET['max_price']) : 65;
    if ($customMaxPrice < 30) $customMaxPrice = 65;

    $today = new DateTime();
    $fromDate = (clone $today)->modify('+1 day')->format('Y-m-d');
    $toDate = (clone $today)->modify('+180 days')->format('Y-m-d');

    $priority = [
        'PMI', 'IBZ', 'MAH', 'SVQ', 'SCQ', 'AGP', 'ALC', 'VLC', 'BIO', 'OVD', 'SDR', 'ZAZ', 'LPA', 'TFN', 'TFS', 'ACE', 'FUE',
        'OPO', 'LIS', 'FAO', 'FNC',
        'BGY', 'MXP', 'FCO', 'CIA', 'NAP', 'BLQ', 'PSA', 'VCE', 'TSF', 'TRS', 'BRI', 'BDS', 'PMO', 'CTA', 'TRN', 'CAG', 'OLB', 'AHO', 'VRN', 'PEG', 'REG',
        'BOD', 'NCE', 'MRS', 'TLS', 'LYS', 'NTE',
        'BRS', 'MAN', 'BHX', 'LPL', 'EDI', 'DUB', 'ORK', 'SNN', 'NCL', 'EMA', 'PIK', 'LTN', 'STN', 'LGW',
        'CRL', 'BRU', 'EIN', 'AMS', 'BER', 'HAM', 'CGN', 'NUE', 'FMM', 'VIE', 'BUD', 'PRG', 'SOF', 'KRK', 'WMI', 'GDN', 'POZ', 'WRO', 'KTW',
        'CPH', 'BLL', 'ARN',
        'GVA', 'BSL',
        'MLA', 'LUX', 'BTS', 'CFU', 'ATH', 'HER', 'JTR', 'ZAD', 'SPU', 'DBV', 'TIA', 'OTP', 'CLJ',
        'RIX', 'TLL', 'VNO',
        'RAK', 'FEZ', 'TNG', 'NDR', 'RBA', 'OUJ', 'OZZ', 'AGA', 'CMN', 'TTU'
    ];
    $blacklisted = ['BVA', 'HHN', 'NYO', 'FKB'];

    $daytripCap = min(50, $customMaxPrice);
    $urls = [
        "https://www.ryanair.com/api/farfnd/v4/roundTripFares?departureAirportIataCode=BCN&outboundDepartureDateFrom={$fromDate}&outboundDepartureDateTo={$toDate}&inboundDepartureDateFrom={$fromDate}&inboundDepartureDateTo={$toDate}&durationFrom=0&durationTo=0&market=es&priceValueTo={$daytripCap}",
        "https://www.ryanair.com/api/farfnd/v4/roundTripFares?departureAirportIataCode=BCN&outboundDepartureDateFrom={$fromDate}&outboundDepartureDateTo={$toDate}&inboundDepartureDateFrom={$fromDate}&inboundDepartureDateTo={$toDate}&durationFrom=1&durationTo=2&market=es&priceValueTo={$customMaxPrice}",
    ];

    foreach ($priority as $dst) {
        $urls[] = "https://www.ryanair.com/api/farfnd/v4/roundTripFares?departureAirportIataCode=BCN&arrivalAirportIataCode={$dst}&outboundDepartureDateFrom={$fromDate}&outboundDepartureDateTo={$toDate}&inboundDepartureDateFrom={$fromDate}&inboundDepartureDateTo={$toDate}&durationFrom=0&durationTo=0&market=es&priceValueTo={$daytripCap}";
        $urls[] = "https://www.ryanair.com/api/farfnd/v4/roundTripFares?departureAirportIataCode=BCN&arrivalAirportIataCode={$dst}&outboundDepartureDateFrom={$fromDate}&outboundDepartureDateTo={$toDate}&inboundDepartureDateFrom={$fromDate}&inboundDepartureDateTo={$toDate}&durationFrom=1&durationTo=2&market=es&priceValueTo={$customMaxPrice}";
    }

    // Ejecución paralela con curl_multi
    $mh = curl_multi_init();
    $handles = [];

    foreach ($urls as $u) {
        $ch = curl_init($u);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 6);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
        curl_multi_add_handle($mh, $ch);
        $handles[] = $ch;
    }

    $running = null;
    do {
        curl_multi_exec($mh, $running);
        curl_multi_select($mh);
    } while ($running > 0);

    $rawFares = [];
    foreach ($handles as $ch) {
        $content = curl_multi_getcontent($ch);
        if ($content) {
            $json = json_decode($content, true);
            if (!empty($json['fares'])) {
                foreach ($json['fares'] as $f) {
                    $rawFares[] = $f;
                }
            }
        }
        curl_multi_remove_handle($mh, $ch);
        curl_close($ch);
    }
    curl_multi_close($mh);

    // Filtrar y estructurar
    $deals = [];
    $uniqueMap = [];

    foreach ($rawFares as $f) {
        $out = $f['outbound'] ?? null;
        $inb = $f['inbound'] ?? null;
        $summary = $f['summary'] ?? null;
        if (!$out || !$inb || !$summary) continue;

        $key = ($out['flightKey'] ?? '') . '__' . ($inb['flightKey'] ?? '');
        if (isset($uniqueMap[$key])) continue;
        $uniqueMap[$key] = true;

        $destIata = $out['arrivalAirport']['iataCode'] ?? '';
        if (in_array(strtoupper($destIata), $blacklisted)) continue;

        $totalPrice = floatval($summary['price']['value'] ?? 0);
        $outArr = strtotime($out['arrivalDate']);
        $inDep = strtotime($inb['departureDate']);
        $usefulHours = ($inDep - $outArr) / 3600;
        if ($usefulHours <= 0) continue;

        $duration = intval($summary['tripDurationDays'] ?? 0);
        $mode = null;

        $outDepMins = intval(date('H', strtotime($out['departureDate']))) * 60 + intval(date('i', strtotime($out['departureDate'])));
        $inDepMins = intval(date('H', strtotime($inb['departureDate']))) * 60 + intval(date('i', strtotime($inb['departureDate'])));

        if ($duration === 0) {
            if ($totalPrice > $daytripCap || $usefulHours < 9.0) continue;
            if ($outDepMins > 570 || $inDepMins < 1185) continue;
            $mode = 'daytrip';
        } elseif ($duration === 1) {
            if ($totalPrice > $customMaxPrice || $usefulHours < 24.0) continue;
            $mode = 'weekend';
        } elseif ($duration === 2) {
            if ($totalPrice > $customMaxPrice || $usefulHours < 42.0) continue;
            $mode = 'bridge';
        } else {
            continue;
        }

        $dateOut = substr($out['departureDate'], 0, 10);
        $dateIn = substr($inb['departureDate'], 0, 10);
        $bookingUrl = "https://www.ryanair.com/es/es/trip/flights/select?originIata=BCN&destinationIata={$destIata}&isReturn=true&dateOut={$dateOut}&dateIn={$dateIn}&adults=1";

        $deals[] = [
            'mode' => $mode,
            'airline' => 'Ryanair',
            'destinationIata' => $destIata,
            'destinationCity' => $out['arrivalAirport']['city']['name'] ?? $destIata,
            'destinationCountry' => $out['arrivalAirport']['countryName'] ?? '',
            'originIata' => 'BCN',
            'totalPrice' => $totalPrice,
            'usefulHours' => $usefulHours,
            'ratio' => $usefulHours / $totalPrice,
            'isPriority' => in_array($destIata, $priority),
            'bookingUrl' => $bookingUrl,
            'outbound' => [
                'flightNumber' => $out['flightNumber'],
                'departureDate' => $out['departureDate'],
                'arrivalDate' => $out['arrivalDate'],
                'price' => $out['price']['value']
            ],
            'inbound' => [
                'flightNumber' => $inb['flightNumber'],
                'departureDate' => $inb['departureDate'],
                'arrivalDate' => $inb['arrivalDate'],
                'price' => $inb['price']['value']
            ]
        ];
    }

    // =========================================================================
    // ESCANEO MULTI-AEROLÍNEA NATIVO VÍA KIWI MCP (Vueling, easyJet, Wizz Air, Iberia, etc.)
    // =========================================================================
    $mcpTargets = ['IBZ', 'PMI', 'MAH', 'SVQ', 'AGP', 'OPO', 'GVA', 'MXP', 'LIS', 'NCE', 'BUD', 'BIO', 'SCQ'];
    shuffle($mcpTargets);
    $selectedTargets = array_slice($mcpTargets, 0, 5); // 5 destinos clave por escaneo para respuesta instantánea

    // Generar fechas para los próximos 3 fines de semana (viernes a domingo y sábados a domingo)
    $mcpDates = [];
    for ($w = 1; $w <= 4; $w++) {
        $friday = (clone $today)->modify("+{$w} week")->modify('next friday')->format('Y-m-d');
        $sunday = (clone $today)->modify("+{$w} week")->modify('next sunday')->format('Y-m-d');
        $saturday = (clone $today)->modify("+{$w} week")->modify('next saturday')->format('Y-m-d');

        $mcpDates[] = ['out' => $friday, 'ret' => $sunday, 'type' => 'bridge'];
        $mcpDates[] = ['out' => $saturday, 'ret' => $sunday, 'type' => 'weekend'];
        // Day-trip express los sábados
        $mcpDates[] = ['out' => $saturday, 'ret' => $saturday, 'type' => 'daytrip'];
    }
    shuffle($mcpDates);
    $selectedDatePairs = array_slice($mcpDates, 0, 2);

    // Preparar peticiones en paralelo con curl_multi a Kiwi MCP
    $kiwiRequests = [];
    foreach ($selectedTargets as $dstIata) {
        foreach ($selectedDatePairs as $dp) {
            $kiwiRequests[] = [
                'dest' => $dstIata,
                'out' => $dp['out'],
                'ret' => $dp['ret'],
                'expectedMode' => $dp['type']
            ];
        }
    }
    // Limitar a máximo 6 peticiones en paralelo para garantizar latencia ultra-rápida (< 3s)
    $kiwiRequests = array_slice($kiwiRequests, 0, 6);

    $mhKiwi = curl_multi_init();
    $kiwiHandles = [];

    foreach ($kiwiRequests as $idx => $req) {
        $args = [
            'flyFrom' => 'BCN',
            'flyTo' => $req['dest'],
            'departureDate' => $req['out'],
            'returnDate' => $req['ret'],
            'max_sector_stopovers' => 0, // Regla de Martín: sólo vuelos directos
            'currency' => 'EUR',
            'price_to' => intval($customMaxPrice),
            'sort' => 'price'
        ];

        $payload = json_encode([
            'jsonrpc' => '2.0',
            'id' => 1000 + $idx,
            'method' => 'tools/call',
            'params' => [
                'name' => 'search-flight',
                'arguments' => $args
            ]
        ]);

        $chK = curl_init('https://mcp.kiwi.com');
        curl_setopt($chK, CURLOPT_POST, true);
        curl_setopt($chK, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($chK, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($chK, CURLOPT_TIMEOUT, 6);
        curl_setopt($chK, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Accept: text/event-stream, application/json'
        ]);
        curl_multi_add_handle($mhKiwi, $chK);
        $kiwiHandles[$idx] = [
            'handle' => $chK,
            'meta' => $req
        ];
    }

    $runningKiwi = null;
    do {
        curl_multi_exec($mhKiwi, $runningKiwi);
        curl_multi_select($mhKiwi);
    } while ($runningKiwi > 0);

    foreach ($kiwiHandles as $kItem) {
        $chK = $kItem['handle'];
        $meta = $kItem['meta'];
        $rawResponse = curl_multi_getcontent($chK);
        curl_multi_remove_handle($mhKiwi, $chK);
        curl_close($chK);

        if (!$rawResponse) continue;

        // Parsear flujo SSE de JSON-RPC
        $lines = explode("\n", $rawResponse);
        $itineraries = [];
        foreach ($lines as $line) {
            $trimmed = trim($line);
            if (str_starts_with($trimmed, 'data:')) {
                $jsonStr = trim(substr($trimmed, 5));
                $parsedRpc = json_decode($jsonStr, true);
                $contentArr = $parsedRpc['result']['content'] ?? [];
                foreach ($contentArr as $c) {
                    if (!empty($c['text'])) {
                        $parsedData = json_decode($c['text'], true);
                        if (!empty($parsedData['itineraries'])) {
                            $itineraries = $parsedData['itineraries'];
                            break 2;
                        }
                    }
                }
            }
        }

        foreach ($itineraries as $it) {
            $price = floatval($it['price'] ?? 0);
            if ($price <= 0 || $price > $customMaxPrice) continue;

            $outSeg = $it['outbound']['segments'][0] ?? null;
            $inSeg = $it['inbound']['segments'][0] ?? null;
            if (!$outSeg || !$inSeg) continue;

            // Descartar si tuviera escalas intermedias
            if (($it['outbound']['stops'] ?? 0) > 0 || ($it['inbound']['stops'] ?? 0) > 0) continue;

            $carrierOut = $outSeg['carrierName'] ?? ($outSeg['carrier'] ?? 'Aerolínea');
            $carrierIn = $inSeg['carrierName'] ?? ($inSeg['carrier'] ?? 'Aerolínea');
            $displayCarrier = ($carrierOut === $carrierIn) ? $carrierOut : "{$carrierOut} / {$carrierIn}";

            $outDep = $outSeg['departureTime'] ?? '';
            $outArr = $outSeg['arrivalTime'] ?? '';
            $inDep = $inSeg['departureTime'] ?? '';
            $inArr = $inSeg['arrivalTime'] ?? '';
            if (!$outDep || !$outArr || !$inDep || !$inArr) continue;

            $diffHours = (strtotime($inDep) - strtotime($outArr)) / 3600;
            if ($diffHours <= 0) continue;

            $outDateOnly = substr($outDep, 0, 10);
            $inDateOnly = substr($inDep, 0, 10);

            $mode = 'bridge';
            if ($outDateOnly === $inDateOnly) {
                if ($price > $daytripCap || $diffHours < 8.0) continue;
                $mode = 'daytrip';
            } else {
                $nights = (strtotime($inDateOnly) - strtotime($outDateOnly)) / 86400;
                if ($nights <= 1) {
                    $mode = 'weekend';
                } else {
                    $mode = 'bridge';
                }
            }

            $destIata = $meta['dest'];
            $destCity = $outSeg['toCity'] ?? ($outSeg['toName'] ?? $destIata);
            $destCountry = $outSeg['toCountry'] ?? '';
            $bookingUrl = $it['bookingUrl'] ?? "https://www.google.com/travel/flights?q=Flights%20to%20{$destIata}%20from%20BCN%20on%20{$outDateOnly}%20through%20{$inDateOnly}";

            $deals[] = [
                'mode' => $mode,
                'airline' => $displayCarrier,
                'destinationIata' => $destIata,
                'destinationCity' => $destCity,
                'destinationCountry' => $destCountry,
                'originIata' => 'BCN',
                'totalPrice' => $price,
                'usefulHours' => $diffHours,
                'ratio' => $diffHours / $price,
                'isPriority' => in_array($destIata, $priority),
                'bookingUrl' => $bookingUrl,
                'outbound' => [
                    'flightNumber' => $outSeg['flightNumber'] ?? $carrierOut,
                    'departureDate' => $outDep,
                    'arrivalDate' => $outArr,
                    'price' => round($price / 2, 2)
                ],
                'inbound' => [
                    'flightNumber' => $inSeg['flightNumber'] ?? $carrierIn,
                    'departureDate' => $inDep,
                    'arrivalDate' => $inArr,
                    'price' => round($price / 2, 2)
                ]
            ];
        }
    }
    curl_multi_close($mhKiwi);

    // Deduplicación y fusión acumulativa con chollos previamente descubiertos
    $dataPath = __DIR__ . '/data/deals.json';
    $existingDealsMap = [];
    if (file_exists($dataPath)) {
        $prevData = json_decode(file_get_contents($dataPath), true);
        if (!empty($prevData['deals']) && is_array($prevData['deals'])) {
            foreach ($prevData['deals'] as $pd) {
                $pOut = substr($pd['outbound']['departureDate'] ?? '', 0, 10);
                $pIn = substr($pd['inbound']['departureDate'] ?? '', 0, 10);
                $pKey = "{$pd['destinationIata']}_{$pOut}_{$pIn}_{$pd['airline']}";
                $existingDealsMap[$pKey] = $pd;
            }
        }
    }

    $allCandidateDeals = array_merge(array_values($existingDealsMap), $deals);
    $uniqueDeals = [];
    $nowIso = date('c');
    $nowTime = time();

    foreach ($allCandidateDeals as $d) {
        $outD = substr($d['outbound']['departureDate'], 0, 10);
        $inD = substr($d['inbound']['departureDate'], 0, 10);
        // Descartar vuelos cuya ida ya haya pasado
        if ($outD < date('Y-m-d')) continue;

        $key = "{$d['destinationIata']}_{$outD}_{$inD}_{$d['airline']}";
        $isBrandNew = !isset($existingDealsMap[$key]);

        // Mantener o asignar fecha de descubrimiento
        if (isset($existingDealsMap[$key]['firstSeen'])) {
            $d['firstSeen'] = $existingDealsMap[$key]['firstSeen'];
            // Ya existía en el escaneo anterior: ya no es "nuevo" en esta tanda
            $d['isNew'] = false;
        } else {
            // Entró recién en este escaneo
            $d['firstSeen'] = $nowIso;
            $d['isNew'] = true;
        }
        
        if (isset($uniqueDeals[$key])) {
            $prev = $uniqueDeals[$key];
            if ($d['totalPrice'] < $prev['totalPrice'] || ($d['totalPrice'] === $prev['totalPrice'] && $d['usefulHours'] > $prev['usefulHours'])) {
                $uniqueDeals[$key] = $d;
            }
        } else {
            $uniqueDeals[$key] = $d;
        }
    }
    $deals = array_values($uniqueDeals);

    // Ordenar: fecha de salida de vuelo más próxima primero (cronológico calendario)
    usort($deals, function($a, $b) {
        $dateA = $a['outbound']['departureDate'] ?? '';
        $dateB = $b['outbound']['departureDate'] ?? '';
        if ($dateA !== $dateB) {
            return strcmp($dateA, $dateB);
        }
        return $a['totalPrice'] <=> $b['totalPrice'];
    });

    // Guardar en data/deals.json
    $exportData = [
        'updatedAt' => date('c'),
        'origin' => 'BCN',
        'totalDeals' => count($deals),
        'stats' => [
            'cheapestPrice' => !empty($deals) ? min(array_column($deals, 'totalPrice')) : 0,
            'maxUsefulHours' => !empty($deals) ? max(array_column($deals, 'usefulHours')) : 0,
            'daytripsCount' => count(array_filter($deals, fn($d) => $d['mode'] === 'daytrip')),
            'weekendsCount' => count(array_filter($deals, fn($d) => $d['mode'] === 'weekend')),
            'bridgesCount' => count(array_filter($deals, fn($d) => $d['mode'] === 'bridge')),
            'destinationsCount' => count(array_unique(array_column($deals, 'destinationIata'))),
        ],
        'deals' => $deals
    ];

    $dataPath = __DIR__ . '/data/deals.json';
    file_put_contents($dataPath, json_encode($exportData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    // Enviar alerta automática a Telegram por cada chollo NUEVO recién detectado
    $newDeals = array_values(array_filter($deals, fn($d) => !empty($d['isNew'])));
    $sentToTelegram = 0;

    if (!empty($newDeals) && !empty($botToken) && !empty($chatId)) {
        // Limitamos a un máximo de 5 alertas por tanda para no spamear Telegram si entran muchos de golpe
        $dealsToSend = array_slice($newDeals, 0, 5);

        foreach ($dealsToSend as $nd) {
            $modeTitle = ($nd['mode'] === 'daytrip') 
                ? '⚡ EXPRESS DAY-TRIP (En el día • 0 € Hotel)' 
                : (($nd['mode'] === 'weekend') ? '🎒 FINDE RELÁMPAGO (1 Noche)' : '🌉 ESCAPADA 2 NOCHES');

            $city = $nd['destinationCity'] ?? $nd['destinationIata'];
            $iata = $nd['destinationIata'];
            $airline = $nd['airline'] ?? 'Aerolínea';
            $hours = number_format($nd['usefulHours'] ?? 0, 1);
            $price = number_format($nd['totalPrice'] ?? 0, 2);
            $url = $nd['bookingUrl'] ?? 'https://www.google.com/travel/flights';

            $outDep = !empty($nd['outbound']['departureDate']) ? date('d/m H:i', strtotime($nd['outbound']['departureDate'])) : '';
            $inDep = !empty($nd['inbound']['departureDate']) ? date('d/m H:i', strtotime($nd['inbound']['departureDate'])) : '';

            $msg = "🔥 *¡NUEVO CHOLLO DETECTADO!*\n"
                 . "🚨 *{$modeTitle}*\n\n"
                 . "✈️ *BCN ➔ {$city} ({$iata})*\n"
                 . "🏢 *Compañía:* {$airline}\n"
                 . "🛫 *Ida:* {$outDep}  |  🛬 *Vuelta:* {$inDep}\n"
                 . "⏱️ *Tiempo útil en destino:* {$hours} horas\n"
                 . "💶 *Precio Total i/v:* *{$price} €*\n\n"
                 . "🔗 [Reservar Vuelo Ahora]({$url})";

            $tgPayload = [
                'chat_id' => $chatId,
                'text' => $msg,
                'parse_mode' => 'Markdown',
                'disable_web_page_preview' => false
            ];

            $ch = curl_init("https://api.telegram.org/bot{$botToken}/sendMessage");
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($tgPayload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 4);
            curl_exec($ch);
            curl_close($ch);

            $sentToTelegram++;
            usleep(250000); // 250ms de pausa entre mensajes
        }
    }

    echo json_encode([
        'status' => true,
        'message' => '¡Rastreo completado en vivo!',
        'totalDeals' => count($deals),
        'newDeals' => count($newDeals),
        'sentToTelegram' => $sentToTelegram,
        'updatedAt' => $exportData['updatedAt']
    ]);
    exit;
}

if ($action === 'status') {
    $dealsPath = __DIR__ . '/data/deals.json';
    $updatedAt = file_exists($dealsPath) ? date('c', filemtime($dealsPath)) : null;
    echo json_encode(['status' => true, 'updatedAt' => $updatedAt]);
    exit;
}

echo json_encode(['status' => false, 'message' => 'Acción no válida.']);
