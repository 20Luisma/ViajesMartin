# ✈️ Vuelos Martín — AI-Powered Flight Deal Radar

> **Radar autónomo de vuelos chollo desde Barcelona-El Prat (BCN).**  
> Multi-aerolínea · Filtros inteligentes de horario · Alertas push en Telegram · Web PWA con dark mode.

🌐 **[Ver en Producción →](https://contenido.creawebes.com/VuelosMartin/)**

---

## 🎯 El Problema que Resuelve

Los buscadores de vuelos muestran precios baratos que en realidad no lo son: un vuelo de 18 € que llega a medianoche te obliga a pagar hotel, taxi y perder medio día. **Precio real: 80 €.**

Este sistema aplica un criterio diferente:

$$\text{Ratio Chollo} = \frac{\text{Horas útiles de turismo en destino}}{\text{Precio total ida y vuelta (€)}}$$

Solo pasan los vuelos con **horarios aprovechables + precio real bajo**. Sin vuelos basura.

---

## 🛫 Las 3 Modalidades de Viaje

| Modalidad | Descripción | Precio objetivo |
|---|---|---|
| ⚡ **Express Day-Trip** | Ida y vuelta en el mismo día. **0 € de hotel.** | 18 € - 35 € |
| 🎒 **Finde Relámpago** | Sábado-Domingo. 1 noche. ~30h de turismo. | 25 € - 45 € |
| 🌉 **Escapada Clásica** | Viernes-Domingo / Puente. ~48h de turismo. | 30 € - 50 € |

**Restricciones duras:** Vuelos 100% directos · Solo aeropuertos con traslado < 30 min al centro.

---

## 🏗️ Stack Técnico

```
Backend     PHP 8.2 · Apache · Hostinger VPS
APIs        Kiwi MCP (Vueling, easyJet, Wizz Air, Air Europa)
            Ryanair FareFinder · Pool rotativo de RapidAPI (11 claves)
Notificaciones  Bot de Telegram con alertas push y enlace directo de compra
Frontend    HTML5 · CSS3 Glassmorphism · Vanilla JS · PWA instalable
Persistencia    JSON flat-file · Motor de deduplicación canónica multi-API
Deploy      rsync + SSH via bin/deploy.sh · Cron desatendido a las 00:00h
Agentes IA  Antigravity God-Mode · MEMORY.md persistente · AGENTS.md por proyecto
```

---

## 🤖 Lo que hace el sistema solo (cada 24h)

1. Escanea **90+ destinos directos desde BCN** en 4 aerolíneas simultáneas
2. Filtra por horarios aprovechables, escalas cero y ratio calidad/precio
3. Deduplica vuelos entre APIs (mismo vuelo no aparece dos veces)
4. Envía alerta push a Telegram con enlace directo a la aerolínea
5. Actualiza la web en tiempo real (botón de escaneo manual también disponible)

---

## 📱 Interfaz Web (PWA)

- Dark mode · Glassmorphism · Responsive para móvil
- Filtros por modalidad, aerolínea, precio máximo y destino
- Botón "📲 Telegram" en cada oferta para reenviar a tu móvil
- Instalable como app nativa en Android/iOS/Chrome
- Copiloto IA integrado para planificación de viajes (Gemini Flash)

---

## 🔐 Seguridad

- Login por sesión PHP protegiendo todos los endpoints
- `.env` con `chmod 600` en producción — cero secretos en el repositorio
- `auth.php` bloqueado por `.htaccess` (módulo interno, no endpoint público)
- Headers HTTP de seguridad: `X-Content-Type-Options`, `X-Frame-Options`
- Rate limiting implícito en pool rotativo de claves API

---

## 🧠 Arquitectura de Agentes IA

Este proyecto usa **Antigravity God-Mode** — un sistema de reglas persistentes que controlan cómo trabaja el agente de IA en cada sesión:

- [`AGENTS.md`](AGENTS.md) — Protocolo de ingeniería y seguridad v2.2 (20 secciones)
- [`MEMORY.md`](MEMORY.md) — Estado técnico persistente entre sesiones
- [`public/god-mode.md`](public/god-mode.md) — Versión pública del protocolo

```bash
# Arrancar sesión de desarrollo con contexto completo
/load_context   # El agente lee MEMORY.md y sabe exactamente dónde estamos

# Guardar estado al cerrar
/save_context   # Actualiza MEMORY.md + backup con timestamp
```

---

## 🚀 Deploy

```bash
# Despliegue completo a producción (sincroniza, escribe .env blindado, verifica HTTP)
bash bin/deploy.sh

# Verificación post-deploy
curl -s -o /dev/null -w "%{http_code}" https://contenido.creawebes.com/VuelosMartin/
# Esperado: 302 (redirect a login activo)
```

---

## 📡 Ejemplo de alerta Telegram

```
🚨 CHOLLO EXPRESS DETECTADO · En el día · 0 € Hotel

✈️  BCN → Oporto (OPO)   Ryanair
📅  Sábado 15 de Noviembre
🕒  Salida 06:45 → Llegada 07:40
🕒  Vuelta  21:50 → Llegada 00:45
⏱️  14 horas netas de turismo
💶  26 € ida y vuelta

🔗 [Comprar en Ryanair.com →]
```

---

*Construido con criterio de viajero real. Sin vuelos trampa.*
