<?php
/**
 * Vuelos Martín — Orquestador de escaneo, fusión acumulativa y exportación
 */

require_once __DIR__ . '/scanner_ryanair.php';
require_once __DIR__ . '/scanner_kiwi.php';
require_once __DIR__ . '/telegram.php';

function mergeAndDeduplicateDeals(array $newBatch, string $dataPath): array
{
    $existingDealsMap = [];
    if (file_exists($dataPath)) {
        $prevData = json_decode(file_get_contents($dataPath) ?: '', true);
        foreach ($prevData['deals'] ?? [] as $pd) {
            $pOut = substr($pd['outbound']['departureDate'] ?? '', 0, 10);
            $pIn = substr($pd['inbound']['departureDate'] ?? '', 0, 10);
            $existingDealsMap["{$pd['destinationIata']}_{$pOut}_{$pIn}_{$pd['airline']}"] = $pd;
        }
    }

    $uniqueDeals = [];
    $nowIso = date('c');
    $todayYmd = date('Y-m-d');

    foreach (array_merge(array_values($existingDealsMap), $newBatch) as $d) {
        $outD = substr($d['outbound']['departureDate'], 0, 10);
        $inD = substr($d['inbound']['departureDate'], 0, 10);
        if ($outD < $todayYmd) {
            continue;
        }

        $key = "{$d['destinationIata']}_{$outD}_{$inD}_{$d['airline']}";
        if (isset($existingDealsMap[$key]['firstSeen'])) {
            $d['firstSeen'] = $existingDealsMap[$key]['firstSeen'];
            $d['isNew'] = false;
        } else {
            $d['firstSeen'] = $nowIso;
            $d['isNew'] = true;
        }

        if (!isset($uniqueDeals[$key])) {
            $uniqueDeals[$key] = $d;
            continue;
        }

        $prev = $uniqueDeals[$key];
        $isBetter = $d['totalPrice'] < $prev['totalPrice']
            || ($d['totalPrice'] === $prev['totalPrice'] && $d['usefulHours'] > $prev['usefulHours']);
        if ($isBetter) {
            $uniqueDeals[$key] = $d;
        }
    }

    $deals = array_values($uniqueDeals);
    usort($deals, static function (array $a, array $b): int {
        $dateA = $a['outbound']['departureDate'] ?? '';
        $dateB = $b['outbound']['departureDate'] ?? '';
        return ($dateA !== $dateB) ? strcmp($dateA, $dateB) : ($a['totalPrice'] <=> $b['totalPrice']);
    });

    return $deals;
}

function handleScan(array $env): void
{
    $customMaxPrice = !empty($_GET['max_price']) ? floatval($_GET['max_price']) : 65;
    if ($customMaxPrice < 30) {
        $customMaxPrice = 65;
    }

    $today = new DateTime();
    $fromDate = (clone $today)->modify('+1 day')->format('Y-m-d');
    $toDate = (clone $today)->modify('+180 days')->format('Y-m-d');
    $daytripCap = min(50, $customMaxPrice);
    $priority = getPriorityDestinations();
    $blacklisted = ['BVA', 'HHN', 'NYO', 'FKB'];

    $ryanairDeals = scanRyanairFares($customMaxPrice, $daytripCap, $fromDate, $toDate, $priority, $blacklisted);
    $kiwiDeals = scanKiwiMcpFares($customMaxPrice, $daytripCap, $today, $priority);

    $dataPath = __DIR__ . '/../data/deals.json';
    $deals = mergeAndDeduplicateDeals(array_merge($ryanairDeals, $kiwiDeals), $dataPath);

    $exportData = [
        'updatedAt' => date('c'),
        'origin' => 'BCN',
        'totalDeals' => count($deals),
        'stats' => [
            'cheapestPrice' => !empty($deals) ? min(array_column($deals, 'totalPrice')) : 0,
            'maxUsefulHours' => !empty($deals) ? max(array_column($deals, 'usefulHours')) : 0,
            'daytripsCount' => count(array_filter($deals, static fn($d) => $d['mode'] === 'daytrip')),
            'weekendsCount' => count(array_filter($deals, static fn($d) => $d['mode'] === 'weekend')),
            'bridgesCount' => count(array_filter($deals, static fn($d) => $d['mode'] === 'bridge')),
            'destinationsCount' => count(array_unique(array_column($deals, 'destinationIata'))),
        ],
        'deals' => $deals,
    ];

    file_put_contents($dataPath, json_encode($exportData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    $newDeals = array_values(array_filter($deals, static fn($d) => !empty($d['isNew'])));
    $sentToTelegram = sendTelegramNewDeals($newDeals, $env);

    echo json_encode([
        'status' => true,
        'message' => '¡Rastreo completado en vivo!',
        'totalDeals' => count($deals),
        'newDeals' => count($newDeals),
        'sentToTelegram' => $sentToTelegram,
        'updatedAt' => $exportData['updatedAt'],
    ]);
}
