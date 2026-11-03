# 🧠 Antigravity God-Mode: Memoria del Proyecto (Vuelos Martín)

## 🌍 Contexto General del Proyecto
Aplicación autónoma de monitorización, rastreo y alerta en tiempo real de **vuelos chollo desde Barcelona-El Prat (BCN)** hacia destinos europeos y de España, optimizada bajo el principio de **máximo aprovechamiento de tiempo útil y mínimo coste posible**.

- **Usuario Principal:** Martín.
- **Ubicación Base:** Esparreguera, Barcelona (Catalunya, España).
- **Aeropuerto de Salida:** **BCN (Josep Tarradellas Barcelona-El Prat)**.
- **Canal de Notificaciones Preferido:** Bot de Telegram propio con alertas push directas al móvil con enlace de compra.
- **Repositorio Local:** `/Users/admin/Desktop/Proyectos/Vuelos Martin`
- **Tono y Trato con Martín:** Tech Lead uruguayo (directo, rioplatense, "vos", "che", "impecable", cero peloteo emocional).

---

## 📌 Perfil de Viajero y Criterio de Selección de Martín

1. **La Filosofía de Horas Útiles (Cero Vuelos Basura):**
   - Martín ya experimentó con éxito viajar a **Lisboa en el día** (salida a las 06:00 AM desde BCN y regreso a las 23:00 PM), conociendo la ciudad entera en una jornada completa sin pagar un solo euro de hotel ni equipaje.
   - Por tanto, la aplicación **NO se limita a viajes de varios días**. Los viajes de 1 día (day-trip) son de altísima prioridad por su ahorro financiero en alojamiento (0 € hotel).
   - Quedan terminantemente descartados los vuelos con horarios trampa (ej. llegar a las 23:30h o salir a las 06:00h de la mañana del último día perdiendo la jornada).

2. **Las 3 Modalidades de Búsqueda:**
   - **Modalidad 1: "Express Day-Trip" (En el día • 0 € Hotel):**
     - Salida BCN: 06:00 - 08:30 AM.
     - Vuelta destino: 20:30 - 23:59 PM.
     - Tiempo libre en ciudad: Mínimo 10 a 14 horas limpias.
     - Destinos top: Palma de Mallorca, Menorca, Ibiza, Oporto, Lisboa, Milán, Burdeos, Niza, Sevilla, Ginebra.
     - Precio objetivo: 18 € a 35 € ida y vuelta.
   - **Modalidad 2: "Finde Relámpago" (1 noche • Sábado a Domingo):**
     - Salida Sábado temprano, vuelta Domingo noche.
     - Tiempo libre: ~30 a 36 horas.
     - Precio objetivo: 25 € a 45 € ida y vuelta.
   - **Modalidad 3: "Escapada Clásica" (2 noches • Viernes a Domingo / Puente):**
     - Salida Viernes tarde o Sábado temprano, vuelta Domingo noche.
     - Tiempo libre: ~48 a 55 horas.
     - Precio objetivo: 30 € a 50 € ida y vuelta.

3. **Restricciones Duras de Vuelo:**
   - **100% Vuelos Directos:** Cero escalas.
   - **Aeropuertos viables:** Descartar aeropuertos remotos cuyo traslado al centro supere el precio del billete (ej. París-Beauvais).

---

## 🛠️ Arquitectura Técnica Diseñada

1. **Módulo de Rastreo (Scanners):**
   - **Tequila API (Kiwi.com):** Búsquedas abiertas (`fly_from=BCN`, `fly_to=europe`, `nights_in_dst_from=0&nights_in_dst_to=2`, ordenado por precio).
   - **Ryanair FareFinder API:** Endpoints públicos de tarifas reducidas desde BCN.
   - **Amadeus Flight Inspiration:** Búsquedas inspiracionales con presupuesto máximo.

2. **Motor de Filtros (Core Logic):**
   - Cálculo del algoritmo de aprovechamiento:
     $$\text{Ratio Chollo} = \frac{\text{Horas Útiles en Destino}}{\text{Precio Total (€)}}$$
   - Si el ratio supera el umbral y el precio es < 45-50 €, se emite la alerta.

3. **Notificador (Telegram Bot):**
   - Envío de alerta Markdown con:
     - Bandera y Ciudad destino.
     - Horario ida (hora salida y llegada).
     - Horario vuelta (hora salida y llegada).
     - Horas netas de turismo.
     - Precio total ida y vuelta.
     - Enlace directo a la aerolínea para reservar en 1 click.

4. **Persistencia (SQLite):**
   - Registro de ofertas encontradas para:
     - No repetir la misma alerta si el precio no baja.
     - Detectar mínimos históricos de precios.

---

## 🚀 Estado Actual y Próximos Pasos

- [x] Carpeta del proyecto inicializada en `/Users/admin/Desktop/Proyectos/Vuelos Martin`.
- [x] Documentación exhaustiva en `README.md` y memoria viva en `MEMORY.md`.
- [x] Reglas maestras `.agents/AGENTS.md` y workflows `/load_context` y `/save_context` configurados.
- [x] Configurar token del bot de Telegram (`TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` vía @miasistente_alfred_bot).
- [x] Implementar el cliente de la API de búsqueda (`src/Scanners/RyanairScanner.js` con barrido global y focalizado en destinos top).
- [x] Implementar el motor de cálculo de horas útiles, descarte de aeropuertos trampa y ratio de calidad (`src/Core/FlightFilter.js`).
- [x] Implementar sistema de persistencia anti-duplicados (`src/Storage/AlertHistory.js`).
- [x] Orquestador CLI y modo daemon continuo (`src/index.js`).
- [x] Interfaz Web Premium (`public/index.html`, `public/css/style.css`, `public/js/app.js`) con dark mode, glassmorphism y filtros dinámicos.
- [x] Despliegue en Producción en Hostinger VPS (`domains/contenido.creawebes.com/public_html/VuelosMartin/`).
- [x] Botón "🔄 Rastrear Ahora" para escaneo manual en tiempo real desde el navegador.
- [x] Botón "📲 Telegram" en cada tarjeta web para reenviarte vuelos a tu móvil con 1 click.
- [x] Integración Multi-Aerolínea Google Flights (`src/Scanners/GoogleFlightsScanner.js` vía RapidAPI) capturando tarifas de **Vueling**, **Air Europa** e **Iberia**.
- [x] Cobertura de destinos en **Marruecos** (Marrakech RAK, Fez FEZ, Tánger TNG, Nador NDR).
- [x] Motor de deduplicación canónica entre APIs cruzadas (Ryanair vs Google Flights).
- [x] Catálogo masivo de **más de 90 destinos directos desde BCN** (cubriendo Europa occidental, oriental, nórdicos, balcanes, bálticos y norte de África).
- [x] Ampliación del horizonte de búsqueda a **180 días vista (hasta finales de abril)**.
- [x] Selector web de precio flexible con filtros hasta **80 € y 100 €**.
- [x] Control resiliente de cuotas de API (gestión automática de HTTP 429 con fallback continuo en Ryanair).
- [x] Blindaje absoluto de credenciales en VPS (`chmod 600` en `.env` y bloqueo 403 en `.htaccess`).
- [x] Cache-busting automático en Apache con `DirectoryIndex index.php` y versionado dinámico `?v=timestamp`.
- [x] Soporte PWA completo (`manifest.json`, `sw.js` y botón "📲 Instalar App") para instalar en Chrome/Móvil como aplicación nativa.
- [x] Diseño 100% responsive para teléfonos móviles con scroll horizontal fluido y botones táctiles optimizados.
- [x] Repositorio público sincronizado en GitHub (`https://github.com/20Luisma/ViajesMartin.git`) con historial 100% blindado y cero credenciales expuestas.
- [x] Pool rotativo multi-cuenta de RapidAPI con 7 claves activas (~700 consultas/mes de Google Flights) y fallback transparente ante 429/403.
- [x] Motor de persistencia y fusión acumulativa de chollos para que los escaneos en vivo sumen vuelos sin perder los anteriores.
- [x] Tarea programada (Cron) en Hostinger configurada para ejecución desatendida diaria a las 00:00 h.
- [x] Checkpoint de seguridad creado: Git Tag `v-estable-2026-11-02` (Kiwi MCP multi-aerolínea + Protocolo AGENTS.md v2.1).
- [x] Protocolo Master de Ingeniería y Seguridad (`AGENTS.md` v2.1) ubicado en la raíz del repositorio y publicado en `public/god-mode.md` y `public/god-mode.txt`.
- [x] Reglas maestras en Antigravity Global (`/Users/admin/.gemini/GEMINI.md`) actualizadas a 20 reglas con cobertura de edge cases y rigor senior.
- [x] **Sistema de Autenticación por Sesión PHP** (`public/auth.php`, `public/login.php`, `public/logout.php`): acceso protegido con clave vía `.env` (`APP_PASSWORD`). Protege tokens de Telegram, Gemini y RapidAPI de uso no autorizado.
- [x] Botón de cierre de sesión 🔒 en el header de la app (redirige a `login.php`).
- [x] Cascada completa: commit `40cb54a` en `main` y desplegado en VPS. Estado HTTP producción: 302 (login activo ✅).

---

## 📝 Historial de Sesiones

### Sesión 2026-11-02 (Integración Multi-Aerolínea Kiwi MCP & Protocolo AGENTS.md v2.1)
- **Problema Detectado:** El Radar de Chollos arrojaba 100% vuelos de Ryanair porque las claves de RapidAPI estaban bloqueadas con HTTP 429 (límite de cuota mensual agotado) y Amadeus descartado por pasar a modelo de cobro obligatorio.
- **Solución Arquitectónica:** Se integró el servidor oficial de **Kiwi MCP** (`https://mcp.kiwi.com`) mediante llamadas JSON-RPC paralelas en `public/api.php`. Permite consultar tarifas en tiempo real de Vueling, easyJet, Wizz Air y Air Europa sin restricciones de cuotas ni coste.
- **Filtros Aplicados:** 
  - Vuelos 100% directos (`max_sector_stopovers: 0`).
  - Categorización estricta por modalidades de Martín (Day-Trip, Finde 1 noche, Puente 2 noches).
  - Cálculo de horas útiles y enlaces directos de compra.
- **Frontend & Estilos:**
  - Se añadieron estilos de marca para `.airline-tag` con colores distintivos: Vueling (amarillo ámbar `#fbbf24`), easyJet (naranja `#fb923c`), Wizz Air (fucsia `#f472b6`), Ryanair (azul `#38bdf8`), Iberia (rojo `#f87171`) y Volotea.
  - El buscador ahora permite filtrar por nombre de aerolínea (ej: "vueling").
  - Normalización de metadatos de aeropuertos (`$canonicalDict` y alias de países en inglés) para evitar fallbacks de bandera `✈️`.
- **Protocolo Master de Ingeniería y Seguridad (AGENTS.md v2.1):**
  - Se creó y pulió el protocolo en la raíz del repositorio (`/AGENTS.md`), resolviendo contradicciones de producción vs staging, eliminando `git reset --hard` ciego en favor de ramas de rollback o `git revert`, y definiendo claramente la autorización explícita.
  - Se expuso en web pública sin referencias personales (`public/god-mode.md` y `public/god-mode.txt`).
  - Se actualizaron las reglas globales de Antigravity (`/Users/admin/.gemini/GEMINI.md`).
- **Cascada Continua & Checkpoint:**
  - Local (Mac): Lint de PHP limpio. 181 chollos activos generados y validados.
  - Producción (Hostinger VPS): Desplegado vía `bin/deploy.sh` y validado HTTP 200 en `https://contenido.creawebes.com/VuelosMartin/` y `god-mode.txt`.
  - GitHub (Nube): Commits sincronizados en rama `main` hasta `53dfbe3`.
  - Checkpoint Tag: `git tag -a v-estable-2026-11-02` creado y sincronizado con `origin`.

### Sesión 2026-11-03 (Sistema de Autenticación por Sesión PHP)
- **Motivación:** El repositorio fue compartido públicamente y alguien podía acceder a la URL del VPS y gastar los tokens de Telegram, Gemini y RapidAPI.
- **Solución Arquitectónica:** Login por sesión PHP con password leído del `.env` (nunca hardcodeado).
  - `public/auth.php`: módulo de sesión seguro con `session_regenerate_id()` (anti session-fixation), cookie `httponly/samesite`, delay anti-brute-force. Para APIs devuelve `401 JSON`; para páginas web redirige a `login.php`.
  - `public/login.php`: página de login premium (glassmorphism, dark mode, toggle show/hide password, animaciones).
  - `public/logout.php`: destruye sesión y redirige al login.
  - `public/index.php` y `public/api.php`: protegidos con `auth_require()`.
  - `public/.htaccess`: bloquea acceso directo a `auth.php` (módulo interno).
  - `bin/deploy.sh`: incluye `APP_PASSWORD` en el `.env` del VPS.
- **Fix aplicado:** Se eliminó `-webkit-text-security: disc` del CSS que impedía el toggle show/hide password.
- **Botón de logout 🔒** añadido en el header de la app con confirmación antes de cerrar sesión.
- **Cascada Continua:**
  - Local (Mac): Lint PHP limpio en los 4 archivos PHP.
  - Producción (Hostinger VPS): Desplegado vía `bin/deploy.sh`. HTTP 302 (redirect al login) confirmado ✅.
  - GitHub (Nube): Commits sincronizados en rama `main` hasta `40cb54a`.
- **Backup de memoria:** `memory_backups/MEMORY_2026-11-03_20-35.md`.
- [x] **AGENTS.md actualizado a v2.2** (commit `a0d7a0d`): Design System real §6, protocolo prueba no ejecutable §8, pipeline honesto §13, §20 Observabilidad nueva.
- [x] **GEMINI.md expandido a 23 reglas**: Regla 2 separada, Regla 5 dividida 5a/5b, Regla 8 por capacidades, Regla 18 pipeline real, Regla 21 Observabilidad, Regla 22 Bootstrap proyecto nuevo, Regla 23 Seguridad 5 capas + checklist.
- [x] **README.md ViajesMartin profesional** (commit `8b6ef66`): stack real, Ratio Chollo, demo alerta Telegram, sección agentes IA.
- [x] **Perfil GitHub `20Luisma`** (commit `3187d10`): "AI Agent Architecture", badge GOD-MODE violeta, descripción agentes IA, tabla ViajesMartin actualizada.

### Sesión 2026-11-03 PM (God-Mode v2.2 + Perfil GitHub)
- **AGENTS.md v2.2** (commit `a0d7a0d`): Design System real §6, protocolo prueba no ejecutable §8 (riesgo bajo/medio/alto + `[TEST-PENDING]`), pipeline honesto §13 (Local→GitHub→VPS), §20 Observabilidad con comandos curl y señales de alerta específicas.
- **GEMINI.md → 23 reglas**: Regla 2 (tono/comportamiento separados), Regla 5 (5a MEMORY + 5b backups), Regla 8 (capacidades no nombres), Regla 18 (pipeline real), Regla 21 (Observabilidad global), Regla 22 (Bootstrap proyecto: entrevista 5 preguntas + AGENTS.md personalizado + estructura completa + primer commit), Regla 23 (Seguridad 5 capas: auth web, API endpoints, archivos sensibles, headers HTTP, validación inputs + checklist pre-deploy).
- **README.md ViajesMartin profesional**: Ratio Chollo con fórmula, 3 modalidades en tabla, stack real, Kiwi MCP, demo alerta Telegram, sección agentes IA, comandos deploy y verificación.
- **Perfil GitHub `20Luisma`**: header "PHP · Flutter · Vue.js · AI Agent Architecture", badge GOD-MODE violeta, "Construyendo sistemas de agentes IA con memoria persistente", tabla ViajesMartin con Kiwi MCP + seguridad + AGENTS.md v2.2.
- **Commits:** ViajesMartin `main → 8b6ef66` | Perfil `20Luisma main → 3187d10`.
- **Backup de memoria:** `memory_backups/MEMORY_2026-11-03_21-30.md`.

