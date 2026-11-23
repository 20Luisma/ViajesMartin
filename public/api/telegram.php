<?php
/**
 * Vuelos Martín — Envío de alertas y mensajes a Telegram
 */

function formatModeTitle(string $mode): string
{
    if ($mode === 'daytrip') {
        return '⚡ EXPRESS DAY-TRIP (En el día • 0 € Hotel)';
    }
    if ($mode === 'weekend') {
        return '🎒 FINDE RELÁMPAGO (1 Noche)';
    }
    return '🌉 ESCAPADA 2 NOCHES';
}

function postTelegramMessage(string $botToken, string $chatId, string $message, int $timeout = 5): array
{
    $tgUrl = "https://api.telegram.org/bot{$botToken}/sendMessage";
    $payload = [
        'chat_id' => $chatId,
        'text' => $message,
        'parse_mode' => 'Markdown',
        'disable_web_page_preview' => false,
    ];

    $ch = curl_init($tgUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST => 1,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => $timeout,
    ]);
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return ['ok' => $httpCode === 200, 'detail' => $result];
}

function handleSendTelegram(array $env): void
{
    $iata = htmlspecialchars($_GET['iata'] ?? 'BCN');
    $city = htmlspecialchars($_GET['city'] ?? $iata);
    $price = htmlspecialchars($_GET['price'] ?? '0');
    $hours = htmlspecialchars($_GET['hours'] ?? '0');
    $mode = htmlspecialchars($_GET['mode'] ?? 'daytrip');
    $airline = htmlspecialchars($_GET['airline'] ?? 'Aerolínea');
    $url = $_GET['url'] ?? 'https://www.ryanair.com';

    $modeTitle = formatModeTitle($mode);
    $message = "🚨 *{$modeTitle}*\n\n"
        . "✈️ *BCN ➔ {$city} ({$iata})*\n"
        . "🏢 *Compañía:* {$airline}\n\n"
        . "⏱️ *Tiempo útil en destino:* {$hours} horas\n"
        . "💶 *Precio Total i/v:* *{$price} €*\n\n"
        . "🔗 [Reservar Vuelo Ahora]({$url})";

    $res = postTelegramMessage($env['TELEGRAM_BOT_TOKEN'] ?? '', $env['TELEGRAM_CHAT_ID'] ?? '', $message, 5);
    if ($res['ok']) {
        echo json_encode(['status' => true, 'message' => '¡Vuelo enviado a tu Telegram!']);
        return;
    }
    echo json_encode(['status' => false, 'message' => 'Error al contactar a Telegram.', 'detail' => $res['detail']]);
}

function sendTelegramNewDeals(array $newDeals, array $env): int
{
    $botToken = $env['TELEGRAM_BOT_TOKEN'] ?? '';
    $chatId = $env['TELEGRAM_CHAT_ID'] ?? '';
    if (empty($newDeals) || empty($botToken) || empty($chatId)) {
        return 0;
    }

    $sent = 0;
    foreach (array_slice($newDeals, 0, 5) as $nd) {
        $modeTitle = formatModeTitle($nd['mode'] ?? 'bridge');
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

        postTelegramMessage($botToken, $chatId, $msg, 4);
        $sent++;
        usleep(250000);
    }

    return $sent;
}
