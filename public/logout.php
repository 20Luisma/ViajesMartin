<?php
/**
 * Vuelos Martín — Logout
 * Destruye la sesión y redirige al login.
 */
require_once __DIR__ . '/auth.php';
auth_logout();
header('Location: login.php');
exit;
