<?php
/**
 * Vuelos Martín — Auth Module
 * Sistema de autenticación por sesión PHP.
 * El password se lee del .env → nunca hardcodeado en código fuente.
 */

// Configurar sesión segura
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_samesite', 'Strict');
if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
    ini_set('session.cookie_secure', 1);
}
session_start();

// Cargar APP_PASSWORD desde .env
function auth_load_password(): string {
    $envFile = file_exists(__DIR__ . '/.env') ? __DIR__ . '/.env' : __DIR__ . '/../.env';
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            if (strpos($line, '=') !== false) {
                [$key, $val] = explode('=', $line, 2);
                if (trim($key) === 'APP_PASSWORD') {
                    return trim($val, " \t\n\r\0\x0B\"'");
                }
            }
        }
    }
    // Fallback a variable de entorno del sistema
    return getenv('APP_PASSWORD') ?: '';
}

// Verificar si la sesión está autenticada
function auth_check(): bool {
    return !empty($_SESSION['vmauth']) && $_SESSION['vmauth'] === true;
}

// Intentar login con el password recibido
function auth_login(string $inputPassword): bool {
    $storedPassword = auth_load_password();
    if (empty($storedPassword)) {
        // Si no hay password configurado, NO permitir acceso
        return false;
    }
    if (hash_equals($storedPassword, $inputPassword)) {
        session_regenerate_id(true); // Previene session fixation
        $_SESSION['vmauth'] = true;
        return true;
    }
    return false;
}

// Logout: destruir sesión completa
function auth_logout(): void {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params['path'], $params['domain'],
            $params['secure'], $params['httponly']
        );
    }
    session_destroy();
}

// Forzar autenticación — redirige al login si no está autenticado
// Para APIs (JSON), devuelve 401 en lugar de redirect
function auth_require(bool $isApi = false): void {
    if (!auth_check()) {
        if ($isApi) {
            http_response_code(401);
            header('Content-Type: application/json; charset=UTF-8');
            echo json_encode(['status' => false, 'error' => 'Unauthorized', 'code' => 401]);
            exit;
        }
        // Para páginas web: redirect al login
        $loginUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http')
            . '://' . $_SERVER['HTTP_HOST']
            . rtrim(dirname($_SERVER['SCRIPT_NAME']), '/') . '/login.php';
        header('Location: ' . $loginUrl);
        exit;
    }
}
