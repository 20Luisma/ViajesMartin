<?php
/**
 * Vuelos Martín — Gestión y persistencia de viajes (trips.json)
 */

function getTripsFilePath(): string
{
    return __DIR__ . '/../data/trips.json';
}

function handleGetTrips(): void
{
    $tripsFile = getTripsFilePath();
    if (file_exists($tripsFile)) {
        echo file_get_contents($tripsFile);
        return;
    }
    echo json_encode(['activeTripId' => '', 'trips' => []]);
}

function handleSaveTrip(): void
{
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput ?: '', true);
    if (!$data) {
        echo json_encode(['status' => false, 'message' => 'JSON inválido']);
        return;
    }
    file_put_contents(getTripsFilePath(), json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(['status' => true, 'message' => 'Viaje guardado correctamente']);
}

function persistUpdatedTrip(array $updatedTrip): array
{
    $tripsFile = getTripsFilePath();
    if (file_exists($tripsFile)) {
        @copy($tripsFile, __DIR__ . '/../data/trips_backup.json');
    }

    $allTrips = file_exists($tripsFile)
        ? (json_decode(file_get_contents($tripsFile) ?: '', true) ?: ['activeTripId' => '', 'trips' => []])
        : ['activeTripId' => '', 'trips' => []];

    $newTripId = $updatedTrip['id'] ?? ('trip_' . time());
    $updatedTrip['id'] = $newTripId;

    $found = false;
    foreach ($allTrips['trips'] as &$trip) {
        if (($trip['id'] ?? '') === $newTripId) {
            $trip = $updatedTrip;
            $found = true;
            break;
        }
    }
    unset($trip);

    if (!$found) {
        $allTrips['trips'][] = $updatedTrip;
    }
    $allTrips['activeTripId'] = $newTripId;
    file_put_contents($tripsFile, json_encode($allTrips, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    return $updatedTrip;
}
