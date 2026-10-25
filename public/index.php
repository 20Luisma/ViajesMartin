<?php
/**
 * Vuelos Martín — Front Controller para Hostinger
 * Sirve la interfaz con cache busting dinámico
 */
header('X-Frame-Options: SAMEORIGIN');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

$html = file_get_contents(__DIR__ . '/index.html');
$v = time();
$html = preg_replace('/css\/style\.css(\?v=[^"\'\s]+)?/', "css/style.css?v={$v}", $html);
$html = preg_replace('/js\/app\.js(\?v=[^"\'\s]+)?/', "js/app.js?v={$v}", $html);
echo $html;


