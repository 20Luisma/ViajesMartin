<?php
/**
 * Vuelos Martín — Escáner paralelo Ryanair FareFinder (PHP)
 */

function getPriorityDestinations(): array
{
    return [
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
}

function fetchRyanairUrlsMulti(array $urls): array
{
    $mh = curl_multi_init();
    $handles = [];
    foreach ($urls as $u) {
        $ch = curl_init($u);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 6,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        ]);
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
                foreach ($json['fares'] as $fare) {
                    $rawFares[] = $fare;
                }
            }
        }
        curl_multi_remove_handle($mh, $ch);
        curl_close($ch);
    }
    curl_multi_close($mh);
    return $rawFares;
}

function classifyRyanairMode(int $duration, float $totalPrice, float $usefulHours, float $daytripCap, float $customMaxPrice, int $outDepMins, int $inDepMins): ?string
{
    if ($duration === 0) {
        if ($totalPrice > $daytripCap || $usefulHours < 9.0 || $outDepMins > 570 || $inDepMins < 1185) {
            return null;
        }
        return 'daytrip';
    }
    if ($duration === 1) {
        return ($totalPrice <= $customMaxPrice && $usefulHours >= 24.0) ? 'weekend' : null;
    }
    if ($duration === 2) {
        return ($totalPrice <= $customMaxPrice && $usefulHours >= 42.0) ? 'bridge' : null;
    }
    return null;
}

function scanRyanairFares(float $customMaxPrice, float $daytripCap, string $fromDate, string $toDate, array $priority, array $blacklisted): array
{
    $base = "https://www.ryanair.com/api/farfnd/v4/roundTripFares?departureAirportIataCode=BCN&outboundDepartureDateFrom={$fromDate}&outboundDepartureDateTo={$toDate}&inboundDepartureDateFrom={$fromDate}&inboundDepartureDateTo={$toDate}&market=es";
    $urls = [
        "{$base}&durationFrom=0&durationTo=0&priceValueTo={$daytripCap}",
        "{$base}&durationFrom=1&durationTo=2&priceValueTo={$customMaxPrice}",
    ];
    foreach ($priority as $dst) {
        $urls[] = "{$base}&arrivalAirportIataCode={$dst}&durationFrom=0&durationTo=0&priceValueTo={$daytripCap}";
        $urls[] = "{$base}&arrivalAirportIataCode={$dst}&durationFrom=1&durationTo=2&priceValueTo={$customMaxPrice}";
    }

    $rawFares = fetchRyanairUrlsMulti($urls);
    $deals = [];
    $uniqueMap = [];

    foreach ($rawFares as $f) {
        $out = $f['outbound'] ?? null;
        $inb = $f['inbound'] ?? null;
        $summary = $f['summary'] ?? null;
        if (!$out || !$inb || !$summary) {
            continue;
        }

        $key = ($out['flightKey'] ?? '') . '__' . ($inb['flightKey'] ?? '');
        if (isset($uniqueMap[$key])) {
            continue;
        }
        $uniqueMap[$key] = true;

        $destIata = $out['arrivalAirport']['iataCode'] ?? '';
        if (in_array(strtoupper($destIata), $blacklisted, true)) {
            continue;
        }

        $totalPrice = floatval($summary['price']['value'] ?? 0);
        $usefulHours = (strtotime($inb['departureDate']) - strtotime($out['arrivalDate'])) / 3600;
        if ($usefulHours <= 0 || $totalPrice <= 0) {
            continue;
        }

        $outTs = strtotime($out['departureDate']);
        $inTs = strtotime($inb['departureDate']);
        $outDepMins = intval(date('H', $outTs)) * 60 + intval(date('i', $outTs));
        $inDepMins = intval(date('H', $inTs)) * 60 + intval(date('i', $inTs));
        $mode = classifyRyanairMode(intval($summary['tripDurationDays'] ?? 0), $totalPrice, $usefulHours, $daytripCap, $customMaxPrice, $outDepMins, $inDepMins);
        if ($mode === null) {
            continue;
        }

        $dateOut = substr($out['departureDate'], 0, 10);
        $dateIn = substr($inb['departureDate'], 0, 10);
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
            'isPriority' => in_array($destIata, $priority, true),
            'bookingUrl' => "https://www.ryanair.com/es/es/trip/flights/select?originIata=BCN&destinationIata={$destIata}&isReturn=true&dateOut={$dateOut}&dateIn={$dateIn}&adults=1",
            'outbound' => [
                'flightNumber' => $out['flightNumber'],
                'departureDate' => $out['departureDate'],
                'arrivalDate' => $out['arrivalDate'],
                'price' => $out['price']['value'],
            ],
            'inbound' => [
                'flightNumber' => $inb['flightNumber'],
                'departureDate' => $inb['departureDate'],
                'arrivalDate' => $inb['arrivalDate'],
                'price' => $inb['price']['value'],
            ],
        ];
    }

    return $deals;
}
