<?php
/**
 * Vuelos Martín — Login Page
 */
require_once __DIR__ . '/auth.php';

$error = '';

// Si ya está autenticado, redirigir directo a la app
if (auth_check()) {
    header('Location: index.php');
    exit;
}

// Procesar intento de login
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $inputPassword = trim($_POST['password'] ?? '');
    if (empty($inputPassword)) {
        $error = 'Ingresá la clave de acceso.';
    } elseif (auth_login($inputPassword)) {
        header('Location: index.php');
        exit;
    } else {
        $error = 'Clave incorrecta. Intentá de nuevo.';
        // Pequeño delay anti-brute-force
        sleep(1);
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acceso — Radar de Chollos ✈️</title>
    <meta name="robots" content="noindex, nofollow">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
            --bg-deep:    #0a0e1a;
            --bg-card:    rgba(255,255,255,0.05);
            --border:     rgba(255,255,255,0.10);
            --accent:     #3b82f6;
            --accent-glow:rgba(59,130,246,0.35);
            --text-main:  #f0f4ff;
            --text-muted: #8b9ab8;
            --error-bg:   rgba(239,68,68,0.15);
            --error-border:rgba(239,68,68,0.5);
            --error-text: #fca5a5;
        }

        body {
            font-family: 'Inter', sans-serif;
            background: var(--bg-deep);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            position: relative;
        }

        /* Fondo animado con gradiente dinámico */
        body::before {
            content: '';
            position: fixed;
            inset: 0;
            background:
                radial-gradient(ellipse 80% 60% at 20% 40%, rgba(59,130,246,0.15) 0%, transparent 60%),
                radial-gradient(ellipse 60% 50% at 80% 70%, rgba(139,92,246,0.12) 0%, transparent 60%);
            animation: bgPulse 8s ease-in-out infinite alternate;
            pointer-events: none;
        }

        @keyframes bgPulse {
            from { opacity: 0.6; }
            to   { opacity: 1.0; }
        }

        /* Partículas de fondo (aviones) */
        .particles {
            position: fixed;
            inset: 0;
            pointer-events: none;
            overflow: hidden;
        }
        .particle {
            position: absolute;
            font-size: 1.2rem;
            opacity: 0.06;
            animation: float linear infinite;
        }
        .particle:nth-child(1)  { left: 5%;  top: 20%; animation-duration: 18s; animation-delay: 0s; }
        .particle:nth-child(2)  { left: 20%; top: 70%; animation-duration: 22s; animation-delay: 3s; }
        .particle:nth-child(3)  { left: 50%; top: 10%; animation-duration: 15s; animation-delay: 6s; }
        .particle:nth-child(4)  { left: 75%; top: 50%; animation-duration: 20s; animation-delay: 1s; }
        .particle:nth-child(5)  { left: 90%; top: 80%; animation-duration: 17s; animation-delay: 9s; }

        @keyframes float {
            from { transform: translateY(0) rotate(45deg); opacity: 0.06; }
            50%  { opacity: 0.12; }
            to   { transform: translateY(-120vh) rotate(45deg); opacity: 0; }
        }

        /* Card de login */
        .login-card {
            position: relative;
            z-index: 10;
            width: 100%;
            max-width: 400px;
            margin: 1rem;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 24px;
            padding: 2.5rem 2rem;
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            box-shadow:
                0 0 0 1px rgba(255,255,255,0.05) inset,
                0 24px 80px rgba(0,0,0,0.6),
                0 0 60px var(--accent-glow);
            animation: cardIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both;
        }

        @keyframes cardIn {
            from { opacity: 0; transform: translateY(30px) scale(0.95); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Header */
        .login-header {
            text-align: center;
            margin-bottom: 2rem;
        }
        .login-icon {
            font-size: 3rem;
            display: block;
            margin-bottom: 0.75rem;
            animation: iconBounce 2s ease-in-out infinite;
        }
        @keyframes iconBounce {
            0%, 100% { transform: translateY(0); }
            50%       { transform: translateY(-6px); }
        }
        .login-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-main);
            letter-spacing: -0.03em;
            margin-bottom: 0.3rem;
        }
        .login-subtitle {
            font-size: 0.85rem;
            color: var(--text-muted);
            font-weight: 400;
        }

        /* Form */
        .form-group {
            margin-bottom: 1.25rem;
        }
        .form-label {
            display: block;
            font-size: 0.8rem;
            font-weight: 500;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 0.5rem;
        }
        .input-wrapper {
            position: relative;
        }
        .input-icon {
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            font-size: 1rem;
            pointer-events: none;
        }
        .form-input {
            width: 100%;
            padding: 0.85rem 1rem 0.85rem 2.75rem;
            background: rgba(255,255,255,0.06);
            border: 1px solid var(--border);
            border-radius: 12px;
            color: var(--text-main);
            font-size: 1rem;
            font-family: 'Inter', sans-serif;
            letter-spacing: 0.15em;
            transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
            -webkit-text-security: disc;
            outline: none;
        }
        .form-input:focus {
            border-color: var(--accent);
            background: rgba(59,130,246,0.08);
            box-shadow: 0 0 0 3px var(--accent-glow);
        }
        .form-input::placeholder { color: var(--text-muted); letter-spacing: normal; }

        /* Toggle show/hide password */
        .toggle-pw {
            position: absolute;
            right: 0.75rem;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            font-size: 1rem;
            padding: 0.25rem;
            border-radius: 6px;
            transition: color 0.2s;
        }
        .toggle-pw:hover { color: var(--text-main); }

        /* Error */
        .error-box {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            background: var(--error-bg);
            border: 1px solid var(--error-border);
            border-radius: 10px;
            padding: 0.7rem 1rem;
            margin-bottom: 1.25rem;
            color: var(--error-text);
            font-size: 0.875rem;
            animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
            10%, 90% { transform: translateX(-2px); }
            20%, 80% { transform: translateX(4px); }
            30%, 50%, 70% { transform: translateX(-4px); }
            40%, 60% { transform: translateX(4px); }
        }

        /* Submit button */
        .btn-login {
            width: 100%;
            padding: 0.9rem;
            background: linear-gradient(135deg, #3b82f6, #6366f1);
            border: none;
            border-radius: 12px;
            color: #fff;
            font-size: 1rem;
            font-weight: 600;
            font-family: 'Inter', sans-serif;
            cursor: pointer;
            transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
            box-shadow: 0 4px 20px rgba(59,130,246,0.4);
            position: relative;
            overflow: hidden;
        }
        .btn-login::after {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
        }
        .btn-login:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(59,130,246,0.55);
        }
        .btn-login:active {
            transform: translateY(0);
            opacity: 0.9;
        }

        /* Footer */
        .login-footer {
            text-align: center;
            margin-top: 1.5rem;
            font-size: 0.75rem;
            color: var(--text-muted);
        }

        @media (max-width: 440px) {
            .login-card { padding: 2rem 1.25rem; border-radius: 20px; }
            .login-title { font-size: 1.3rem; }
        }
    </style>
</head>
<body>

<div class="particles" aria-hidden="true">
    <span class="particle">✈️</span>
    <span class="particle">🛫</span>
    <span class="particle">✈️</span>
    <span class="particle">🛬</span>
    <span class="particle">✈️</span>
</div>

<div class="login-card" role="main">
    <div class="login-header">
        <span class="login-icon">🛫</span>
        <h1 class="login-title">Radar de Chollos</h1>
        <p class="login-subtitle">Acceso privado · Solo para Martín</p>
    </div>

    <?php if ($error): ?>
    <div class="error-box" role="alert">
        <span>🔒</span>
        <span><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></span>
    </div>
    <?php endif; ?>

    <form method="POST" action="login.php" id="login-form" autocomplete="off">
        <div class="form-group">
            <label class="form-label" for="password">Clave de Acceso</label>
            <div class="input-wrapper">
                <span class="input-icon">🔑</span>
                <input
                    type="password"
                    id="password"
                    name="password"
                    class="form-input"
                    placeholder="••••••••"
                    autocomplete="current-password"
                    autofocus
                    required
                >
                <button type="button" class="toggle-pw" id="toggle-pw" aria-label="Mostrar/ocultar clave" title="Mostrar clave">👁️</button>
            </div>
        </div>
        <button type="submit" class="btn-login" id="btn-submit">
            Entrar al Radar ✈️
        </button>
    </form>

    <p class="login-footer">Vuelos desde BCN · Sistema privado</p>
</div>

<script>
(function () {
    const pwInput = document.getElementById('password');
    const toggleBtn = document.getElementById('toggle-pw');
    const form = document.getElementById('login-form');
    const btn = document.getElementById('btn-submit');

    // Toggle show/hide password
    toggleBtn.addEventListener('click', function () {
        const isHidden = pwInput.type === 'password';
        pwInput.type = isHidden ? 'text' : 'password';
        toggleBtn.textContent = isHidden ? '🙈' : '👁️';
    });

    // Deshabilitar botón al enviar para evitar doble submit
    form.addEventListener('submit', function () {
        btn.disabled = true;
        btn.textContent = 'Verificando...';
    });

    // Enter en el input envía el form
    pwInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') form.submit();
    });
})();
</script>
</body>
</html>
