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
- [x] Checkpoint de seguridad creado: Git Tag `v-estable-2026-10-25`.
- [x] Conector oficial **Kiwi MCP** (`https://mcp.kiwi.com`) integrado nativamente en `public/api.php` vía cURL multi paralelo (cero API keys, sin cuotas ni bloqueos 429).
- [x] Soporte Multi-Aerolínea activo en el Radar: ofertas reales de **Vueling**, **easyJet**, **Wizz Air**, **Air Europa** e itinerarios combinados.
- [x] Identidad visual de aerolíneas en frontend con badges específicos por color y buscador con filtrado por nombre de compañía.
- [x] PWA actualizada a Service Worker `vuelos-martin-v9` con asset versioning `?v=4.7`.

---

## 📝 Historial de Sesiones

### Sesión 2026-11-02 (Integración Multi-Aerolínea Kiwi MCP & Copiloto Inteligente)
- **Problema Detectado:** El Radar de Chollos arrojaba 100% vuelos de Ryanair porque las claves de RapidAPI estaban bloqueadas con HTTP 429 (límite de cuota mensual agotado) y Amadeus descartado por pasar a modelo de cobro obligatorio.
- **Solución Arquitectónica:** Se integró el servidor oficial de **Kiwi MCP** (`https://mcp.kiwi.com`) mediante llamadas JSON-RPC paralelas en `public/api.php`. Permite consultar tarifas en tiempo real de Vueling, easyJet, Wizz Air y Air Europa sin restricciones de cuotas ni coste.
- **Filtros Aplicados:** 
  - Vuelos 100% directos (`max_sector_stopovers: 0`).
  - Categorización estricta por modalidades de Martín (Day-Trip, Finde 1 noche, Puente 2 noches).
  - Cálculo de horas útiles y enlaces directos de compra.
- **Frontend & Estilos:**
  - Se añadieron estilos de marca para `.airline-tag` con colores distintivos: Vueling (amarillo ámbar `#fbbf24`), easyJet (naranja `#fb923c`), Wizz Air (fucsia `#f472b6`), Ryanair (azul `#38bdf8`), Iberia (rojo `#f87171`) y Volotea.
  - El buscador ahora permite filtrar por nombre de aerolínea (ej: "vueling").
- **Cascada Continua:**
  - Local (Mac): Lint de PHP limpio y 76 chollos cazados en prueba local.
  - Producción (Hostinger VPS): Desplegado vía `bin/deploy.sh` y validado HTTP 200 en `https://contenido.creawebes.com/VuelosMartin/`.
  - GitHub (Nube): Commit `098fbaf` pusheado a rama `main`.


