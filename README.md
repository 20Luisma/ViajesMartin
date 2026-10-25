# ✈️ Vuelos Martín — Cazador Inteligente de Vuelos Chollo desde BCN

Aplicación autónoma de monitorización y alerta de vuelos económicos desde el **Aeropuerto Josep Tarradellas Barcelona-El Prat (BCN)** hacia destinos europeos y nacionales, optimizada bajo el principio de **máximo aprovechamiento de tiempo y mínimo coste**.

---

## 🌐 Entorno de Producción
* **URL Pública:** [https://contenido.creawebes.com/VuelosMartin/](https://contenido.creawebes.com/VuelosMartin/)
* **Servidor:** Hostinger VPS (Apache / PHP 8.2+)
* **Despliegue:** `bin/deploy.sh` (sincronización rsync sin exponer credenciales)

---

## 🎯 Filosofía Central: "Horas Útiles vs Precio" (Cero Vuelos Basura)

La mayoría de los buscadores low-cost muestran precios engañosos (vuelos de 18 € que llegan a medianoche y regresan al amanecer, obligando a pagar 2 noches de hotel para no ver nada de la ciudad).

**Vuelos Martín** filtra con criterio de viajero real:
1. **Vuelos 100% Directos:** Sin escalas que hagan perder horas de viaje.
2. **Horarios Útiles:** Llegada temprana y regreso tardío.
3. **Ratio Chollo Real:**
   $$\text{Ratio Chollo} = \frac{\text{Horas Útiles de Turismo en la Ciudad}}{\text{Precio Total Ida y Vuelta (€)}}$$

---

## 🧭 Las 3 Modalidades de Viaje

### 1. ⚡ Express Day-Trip (Ida y Vuelta en el Mismo Día • 0 € de Hotel)
- **Concepto:** Salir temprano, pasar todo el día conociendo una ciudad europea o española y volver a dormir a casa.
- **Coste de alojamiento:** **0 €**.
- **Horarios:** Salida BCN 06:00 - 08:30 AM | Regreso destino 20:30 - 23:59 PM.
- **Tiempo útil garantizado:** **10 a 14 horas limpias de turismo**.
- **Destinos típicos:** Palma de Mallorca, Ibiza, Menorca, Oporto, Lisboa, Milán, Burdeos, Niza, Sevilla, Ginebra.
- **Precio objetivo:** 18 € a 35 € ida y vuelta.

### 2. 🎒 Finde Relámpago (1 Noche • Sábado a Domingo)
- **Concepto:** Escapada de fin de semana con una sola noche de hotel.
- **Horarios:** Salida Sábado temprano | Regreso Domingo noche.
- **Tiempo útil garantizado:** **~30 a 36 horas netas**.
- **Precio objetivo:** 25 € a 45 € ida y vuelta.

### 3. 🌉 Escapada Clásica (2 Noches • Viernes a Domingo / Puente)
- **Concepto:** Finde completo o puente festivo.
- **Horarios:** Salida Viernes tarde o Sábado temprano | Regreso Domingo noche.
- **Tiempo útil garantizado:** **~48 a 55 horas netas**.
- **Precio objetivo:** 30 € a 50 € ida y vuelta.

---

## 🏗️ Arquitectura Técnica del Sistema

```
vuelos-martin/
├── .agents/                    # Reglas de Antigravity God-Mode & Workflows
│   ├── AGENTS.md
│   └── workflows/
│       ├── load_context.md
│       └── save_context.md
├── config/                     # Parámetros, listas de aeropuertos y umbrales
│   └── settings.json
├── src/                        # Código fuente modular
│   ├── Scanner/                # Conectores de APIs (Kiwi Tequila, Ryanair, Amadeus)
│   ├── Filters/                # Algoritmo de Horas Útiles y Ratio Chollo
│   ├── Notifier/               # Bot de Telegram con alertas push instantáneas
│   └── Storage/                # SQLite para histórico y control anti-duplicados
├── storage/                    # Base de datos local y caché
├── MEMORY.md                   # Memoria persistente del proyecto y perfil de Martín
└── README.md                   # Este documento
```

---

## 🔔 Notificaciones Instantáneas (Telegram Bot)

Cada vez que el motor detecta un chollo que cumple los filtros, envía una notificación push al móvil de Martín:

> 🚨 **CHOLLO EXPRESS DETECTADO (En el día • 0 € Hotel)**  
> ✈️ **BCN ➔ Oporto (OPO)**  
> 📅 **Fecha:** Sábado 15 de Noviembre  
> 🕒 **Horarios:** Salida BCN 06:45 ➔ Llegada OPO 07:40 | Vuelta OPO 21:50 ➔ Llegada BCN 00:45  
> ⏱️ **Tiempo libre en la ciudad:** 14 horas netas  
> 💶 **Precio total:** **26 €** ida y vuelta (Ryanair)  
> 🔗 [Comprar en Web Oficial de Ryanair]

---

## 🚀 Puesta en Marcha

Cuando abras este proyecto en **Antigravity IDE**:
1. Ejecutá `/load_context` para que el asistente cargue el contexto de inmediato.
2. El asistente leerá [MEMORY.md](MEMORY.md) y sabrá exactamente tus gustos, filtros y arquitectura a implementar.
