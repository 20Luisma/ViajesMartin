<?php
/**
 * Vuelos Martín — Escáner Multi-Aerolínea vía Kiwi MCP (JSON-RPC)
 */

function getCanonicalAirportMeta(string $destIata, array $outSeg): array
{
    $canonicalDict = [
        'PMI' => ['city' => 'Palma de Mallorca', 'country' => 'España'],
        'IBZ' => ['city' => 'Ibiza', 'country' => 'España'],
        'MAH' => ['city' => 'Menorca', 'country' => 'España'],
        'SVQ' => ['city' => 'Sevilla', 'country' => 'España'],
        'AGP' => ['city' => 'Málaga', 'country' => 'España'],
        'BIO' => ['city' => 'Bilbao', 'country' => 'España'],
        'SCQ' => ['city' => 'Santiago de Compostela', 'country' => 'España'],
        'OVD' => ['city' => 'Asturias', 'country' => 'España'],
        'ALC' => ['city' => 'Alicante', 'country' => 'España'],
        'VLC' => ['city' => 'Valencia', 'country' => 'España'],
        'OPO' => ['city' => 'Oporto', 'country' => 'Portugal'],
        'LIS' => ['city' => 'Lisboa', 'country' => 'Portugal'],
        'FAO' => ['city' => 'Faro', 'country' => 'Portugal'],
        'MXP' => ['city' => 'Milán Malpensa', 'country' => 'Italia'],
        'BGY' => ['city' => 'Milán Bérgamo', 'country' => 'Italia'],
        'FCO' => ['city' => 'Roma Fiumicino', 'country' => 'Italia'],
        'CIA' => ['city' => 'Roma Ciampino', 'country' => 'Italia'],
        'NAP' => ['city' => 'Nápoles', 'country' => 'Italia'],
        'BLQ' => ['city' => 'Bolonia', 'country' => 'Italia'],
        'PSA' => ['city' => 'Pisa', 'country' => 'Italia'],
        'VCE' => ['city' => 'Venecia', 'country' => 'Italia'],
        'NCE' => ['city' => 'Niza', 'country' => 'Francia'],
        'MRS' => ['city' => 'Marsella', 'country' => 'Francia'],
        'TLS' => ['city' => 'Toulouse', 'country' => 'Francia'],
        'LYS' => ['city' => 'Lyon', 'country' => 'Francia'],
        'BOD' => ['city' => 'Burdeos', 'country' => 'Francia'],
        'GVA' => ['city' => 'Ginebra', 'country' => 'Suiza'],
        'BSL' => ['city' => 'Basilea', 'country' => 'Suiza'],
        'LGW' => ['city' => 'Londres Gatwick', 'country' => 'Reino Unido'],
        'LTN' => ['city' => 'Londres Luton', 'country' => 'Reino Unido'],
        'MAN' => ['city' => 'Mánchester', 'country' => 'Reino Unido'],
        'EDI' => ['city' => 'Edimburgo', 'country' => 'Reino Unido'],
        'DUB' => ['city' => 'Dublín', 'country' => 'Irlanda'],
        'BUD' => ['city' => 'Budapest', 'country' => 'Hungría'],
        'PRG' => ['city' => 'Praga', 'country' => 'República Checa'],
        'VIE' => ['city' => 'Viena', 'country' => 'Austria'],
        'SOF' => ['city' => 'Sofía', 'country' => 'Bulgaria'],
        'FEZ' => ['city' => 'Fez', 'country' => 'Marruecos'],
        'RAK' => ['city' => 'Marrakech', 'country' => 'Marruecos'],
        'TNG' => ['city' => 'Tánger', 'country' => 'Marruecos'],
    ];

    if (isset($canonicalDict[$destIata])) {
        return $canonicalDict[$destIata];
    }

    $rawCountry = $outSeg['toCountry'] ?? '';
    $countryMap = [
        'Spain' => 'España', 'Italy' => 'Italia', 'France' => 'Francia',
        'United Kingdom' => 'Reino Unido', 'Morocco' => 'Marruecos',
        'Switzerland' => 'Suiza', 'Germany' => 'Alemania', 'Hungary' => 'Hungría',
    ];

    return [
        'city' => $outSeg['toCity'] ?? ($outSeg['toName'] ?? $destIata),
        'country' => $countryMap[$rawCountry] ?? $rawCountry,
    ];
}

function parseKiwiSseItineraries(string $rawResponse): array
{
    foreach (explode("\n", $rawResponse) as $line) {
        $trimmed = trim($line);
        if (!str_starts_with($trimmed, 'data:')) {
            continue;
        }
        $parsedRpc = json_decode(trim(substr($trimmed, 5)), true);
        foreach ($parsedRpc['result']['content'] ?? [] as $contentItem) {
            if (empty($contentItem['text'])) {
                continue;
            }
            $parsedData = json_decode($contentItem['text'], true);
            if (!empty($parsedData['itineraries'])) {
                return $parsedData['itineraries'];
            }
        }
    }
    return [];
}

function normalizeKiwiItinerary(array $it, string $destIata, float $customMaxPrice, float $daytripCap, array $priority): ?array
{
    $price = floatval($it['price'] ?? 0);
    $outSeg = $it['outbound']['segments'][0] ?? null;
    $inSeg = $it['inbound']['segments'][0] ?? null;
    if ($price <= 0 || $price > $customMaxPrice || !$outSeg || !$inSeg) {
        return null;
    }
    if (($it['outbound']['stops'] ?? 0) > 0 || ($it['inbound']['stops'] ?? 0) > 0) {
        return null;
    }

    $outDep = $outSeg['departureTime'] ?? '';
    $outArr = $outSeg['arrivalTime'] ?? '';
    $inDep = $inSeg['departureTime'] ?? '';
    $inArr = $inSeg['arrivalTime'] ?? '';
    if (!$outDep || !$outArr || !$inDep || !$inArr) {
        return null;
    }

    $diffHours = (strtotime($inDep) - strtotime($outArr)) / 3600;
    if ($diffHours <= 0) {
        return null;
    }

    $outDateOnly = substr($outDep, 0, 10);
    $inDateOnly = substr($inDep, 0, 10);
    if ($outDateOnly === $inDateOnly) {
        if ($price > $daytripCap || $diffHours < 8.0) {
            return null;
        }
        $mode = 'daytrip';
    } else {
        $nights = (strtotime($inDateOnly) - strtotime($outDateOnly)) / 86400;
        $mode = ($nights <= 1) ? 'weekend' : 'bridge';
    }

    $carrierOut = $outSeg['carrierName'] ?? ($outSeg['carrier'] ?? 'Aerolínea');
    $carrierIn = $inSeg['carrierName'] ?? ($inSeg['carrier'] ?? 'Aerolínea');
    $displayCarrier = ($carrierOut === $carrierIn) ? $carrierOut : "{$carrierOut} / {$carrierIn}";
    $meta = getCanonicalAirportMeta($destIata, $outSeg);
    $bookingUrl = $it['bookingUrl'] ?? "https://www.google.com/travel/flights?q=Flights%20to%20{$destIata}%20from%20BCN%20on%20{$outDateOnly}%20through%20{$inDateOnly}";

    return [
        'mode' => $mode,
        'airline' => $displayCarrier,
        'destinationIata' => $destIata,
        'destinationCity' => $meta['city'],
        'destinationCountry' => $meta['country'],
        'originIata' => 'BCN',
        'totalPrice' => $price,
        'usefulHours' => $diffHours,
        'ratio' => $diffHours / $price,
        'isPriority' => in_array($destIata, $priority, true),
        'bookingUrl' => $bookingUrl,
        'outbound' => [
            'flightNumber' => $outSeg['flightNumber'] ?? $carrierOut,
            'departureDate' => $outDep,
            'arrivalDate' => $outArr,
            'price' => round($price / 2, 2),
        ],
        'inbound' => [
            'flightNumber' => $inSeg['flightNumber'] ?? $carrierIn,
            'departureDate' => $inDep,
            'arrivalDate' => $inArr,
            'price' => round($price / 2, 2),
        ],
    ];
}

function scanKiwiMcpFares(float $customMaxPrice, float $daytripCap, DateTime $today, array $priority): array
{
    $mcpTargetsPool = ['MAH', 'GVA', 'MXP', 'NCE', 'SVQ', 'OPO', 'BIO', 'AGP', 'IBZ', 'PMI', 'BUD', 'LTN', 'LGW', 'SCQ', 'OVD'];
    shuffle($mcpTargetsPool);
    $selectedTargets = array_slice($mcpTargetsPool, 0, 7);

    $rangeStart = (clone $today)->modify('+2 days')->format('d/m/Y');
    $rangeEnd = (clone $today)->modify('+180 days')->format('d/m/Y');

    $mh = curl_multi_init();
    $handles = [];
    foreach ($selectedTargets as $idx => $targetIata) {
        $payload = json_encode([
            'jsonrpc' => '2.0',
            'id' => 1000 + $idx,
            'method' => 'tools/call',
            'params' => [
                'name' => 'search-flight',
                'arguments' => [
                    'flyFrom' => 'BCN',
                    'flyTo' => $targetIata,
                    'departureDate' => $rangeStart,
                    'departureDateTo' => $rangeEnd,
                    'nights_in_dst_from' => 0,
                    'nights_in_dst_to' => 2,
                    'max_sector_stopovers' => 0,
                    'currency' => 'EUR',
                    'price_to' => intval($customMaxPrice),
                    'sort' => 'price',
                ],
            ],
        ]);
        $ch = curl_init('https://mcp.kiwi.com');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 6,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: text/event-stream, application/json'],
        ]);
        curl_multi_add_handle($mh, $ch);
        $handles[] = ['handle' => $ch, 'dest' => $targetIata];
    }

    $running = null;
    do {
        curl_multi_exec($mh, $running);
        curl_multi_select($mh);
    } while ($running > 0);

    $deals = [];
    foreach ($handles as $item) {
        $raw = curl_multi_getcontent($item['handle']);
        curl_multi_remove_handle($mh, $item['handle']);
        curl_close($item['handle']);
        if (!$raw) {
            continue;
        }
        foreach (parseKiwiSseItineraries($raw) as $it) {
            $deal = normalizeKiwiItinerary($it, $item['dest'], $customMaxPrice, $daytripCap, $priority);
            if ($deal !== null) {
                $deals[] = $deal;
            }
        }
    }
    curl_multi_close($mh);
    return $deals;
}
