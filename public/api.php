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
        }
    }
}

// Carga desde variables de entorno del sistema
if (empty($botToken)) $botToken = getenv('TELEGRAM_BOT_TOKEN') ?: '';
if (empty($chatId)) $chatId = getenv('TELEGRAM_CHAT_ID') ?: '';
if (empty($rapidApiKey)) $rapidApiKey = getenv('RAPIDAPI_KEY') ?: '';

$action = $_GET['action'] ?? ($argv[1] ?? (php_sapi_name() === 'cli' ? 'scan' : ''));

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

    // Escaneo de Google Flights (Vueling, Air Europa, etc.) si hay claves disponibles
    $rapidApiKeys = array_values(array_filter(array_map('trim', explode(',', $rapidApiKey))));
    $currentKeyIndex = 0;

    if (!empty($rapidApiKeys)) {
        $gfTargets = ['IBZ', 'PMI', 'SVQ', 'MAH', 'OPO'];
        $gfDates = [
            ['out' => '2026-11-13', 'ret' => '2026-11-15'],
            ['out' => '2026-11-20', 'ret' => '2026-11-22'],
            ['out' => '2026-11-27', 'ret' => '2026-11-29'],
        ];

        $metaDict = [
            'IBZ' => ['city' => 'Ibiza', 'country' => 'España'],
            'PMI' => ['city' => 'Palma de Mallorca', 'country' => 'España'],
            'SVQ' => ['city' => 'Sevilla', 'country' => 'España'],
            'MAH' => ['city' => 'Menorca', 'country' => 'España'],
            'OPO' => ['city' => 'Oporto', 'country' => 'Portugal'],
        ];

        foreach ($gfTargets as $targetIata) {
            foreach ($gfDates as $dates) {
                if ($currentKeyIndex >= count($rapidApiKeys)) {
                    break 2; // Todas las claves del pool agotaron su cuota
                }

                $activeKey = $rapidApiKeys[$currentKeyIndex];
                $gfUrl = "https://google-flights4.p.rapidapi.com/flights/search-roundtrip?departureId=BCN&arrivalId={$targetIata}&departureDate={$dates['out']}&arrivalDate={$dates['ret']}&currency=EUR";
                
                $chGf = curl_init($gfUrl);
                curl_setopt($chGf, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($chGf, CURLOPT_TIMEOUT, 6);
                curl_setopt($chGf, CURLOPT_HTTPHEADER, [
                    "x-rapidapi-host: google-flights4.p.rapidapi.com",
                    "x-rapidapi-key: " . $activeKey
                ]);
                $gfRes = curl_exec($chGf);
                $gfCode = curl_getinfo($chGf, CURLINFO_HTTP_CODE);
                curl_close($chGf);

                // Si esta clave agotó cuota (429) o falló, rotamos a la siguiente del pool de inmediato
                if ($gfCode === 429 || $gfCode === 403) {
                    $currentKeyIndex++;
                    continue;
                }

                if ($gfCode === 200 && $gfRes) {
                    $gfJson = json_decode($gfRes, true);
                    $gfList = array_merge($gfJson['data']['topFlights'] ?? [], $gfJson['data']['otherFlights'] ?? []);

                    foreach ($gfList as $f) {
                        $price = floatval($f['price'] ?? 0);
                        if ($price <= 0 || $price > $customMaxPrice) continue;

                        $airlineName = ($f['airlineNames'][0] ?? '') ?: ($f['airlineCode'] ?? 'Aerolínea');
                        $segOut = $f['segments'][0] ?? null;
                        if (!$segOut) continue;

                        $flightNum = ($f['airlineCode'] ?? '') . ($segOut['flightNumber'] ?? '');
                        $outDepTime = "{$dates['out']}T" . ($segOut['departureTime'] ?? '08:00') . ":00";
                        $outArrTime = "{$dates['out']}T" . ($segOut['arrivalTime'] ?? '09:00') . ":00";
                        $inDepTime = "{$dates['ret']}T20:30:00";
                        $inArrTime = "{$dates['ret']}T22:15:00";

                        $diffHours = (strtotime($inDepTime) - strtotime($outArrTime)) / 3600;
                        if ($diffHours <= 0) continue;

                        $info = $metaDict[$targetIata] ?? ['city' => $targetIata, 'country' => ''];
                        $bUrl = "https://www.google.com/travel/flights?q=Flights%20to%20{$targetIata}%20from%20BCN%20on%20{$dates['out']}%20through%20{$dates['ret']}";

                        $deals[] = [
                            'mode' => 'bridge',
                            'airline' => $airlineName,
                            'destinationIata' => $targetIata,
                            'destinationCity' => $info['city'],
                            'destinationCountry' => $info['country'],
                            'originIata' => 'BCN',
                            'totalPrice' => $price,
                            'usefulHours' => $diffHours,
                            'ratio' => $diffHours / $price,
                            'isPriority' => true,
                            'bookingUrl' => $bUrl,
                            'outbound' => [
                                'flightNumber' => $flightNum ?: $airlineName,
                                'departureDate' => $outDepTime,
                                'arrivalDate' => $outArrTime,
                                'price' => round($price / 2, 2)
                            ],
                            'inbound' => [
                                'flightNumber' => $airlineName,
                                'departureDate' => $inDepTime,
                                'arrivalDate' => $inArrTime,
                                'price' => round($price / 2, 2)
                            ]
                        ];
                    }
                }
            }
        }
    }

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

    // Ordenar: primero los nuevos en esta tanda, luego los más recientes y desempate por ratio
    usort($deals, function($a, $b) {
        $isNewA = !empty($a['isNew']) ? 1 : 0;
        $isNewB = !empty($b['isNew']) ? 1 : 0;
        if ($isNewA !== $isNewB) return $isNewB <=> $isNewA;

        $timeA = !empty($a['firstSeen']) ? strtotime($a['firstSeen']) : 0;
        $timeB = !empty($b['firstSeen']) ? strtotime($b['firstSeen']) : 0;
        if ($timeA !== $timeB) return $timeB <=> $timeA;

        if ($a['isPriority'] && !$b['isPriority']) return -1;
        if (!$a['isPriority'] && $b['isPriority']) return 1;
        return $b['ratio'] <=> $a['ratio'];
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

    echo json_encode([
        'status' => true,
        'message' => '¡Rastreo completado en vivo!',
        'totalDeals' => count($deals),
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
