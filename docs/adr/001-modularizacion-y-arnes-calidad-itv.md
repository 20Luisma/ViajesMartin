# ADR-001: Modularización Backend/Frontend y Arnés Real de Calidad ITV 7/7

- **Fecha:** 2026-11-23
- **Estado:** Aceptada

## Contexto
La auditoría ITV detectó dos archivos monolíticos con alta complejidad ciclomática (`public/api.php` con 752 líneas / 229 ramas y `public/js/app.js` con 1414 líneas / 257 ramas), ausencia de análisis estático de tipos, suite de tests unitarios/E2E, lockfile para `npm audit`, un salto de encabezados WCAG (`h1` → `h3`) y falta de observabilidad fail-safe.

## Decisión
1. **Backend PHP modular (`public/api/`):** Extraer `env.php`, `observability.php`, `trips.php`, `copilot.php`, `telegram.php`, `scanner_ryanair.php`, `scanner_kiwi.php` y `scan.php`, dejando `public/api.php` como router liviano con contratos HTTP 100% invariantes y bloqueo directo vía `public/api/.htaccess`.
2. **Frontend ES Modules (`public/js/modules/`):** Dividir `public/js/app.js` en `constants.js`, `pwa.js`, `radar.js`, `trips.js`, `copilot.js` y `photoCleaner.js`, preservando `window.app` y cache-busting en `public/index.php`.
3. **Calidad Real sin Omisiones:** Incorporar TypeScript (`checkJs: true`), Vitest + `@vitest/coverage-v8` (>= 75% cobertura), Playwright E2E con servidor local dedicado, `package-lock.json` con 0 CVEs, observabilidad fail-safe (`ErrorLogger` + `observability.php`) y corrección de jerarquía WCAG 2.1 AA en `public/index.html`.

## Requisitos de Entorno e Instalación
- **Node.js ≥ 20 + npm:** instalar con `npm ci` (usa `package-lock.json` con 0 CVEs: `typescript`, `@types/node`, `vitest`, `@vitest/coverage-v8`, `@playwright/test`) y `npx playwright install chromium` en entornos limpios.
- **PHP ≥ 8.2 (sin Composer/`vendor/`):** el backend en `public/` es PHP nativo puro sin dependencias de terceros, evitando peso extra en Hostinger VPS y manteniendo `bin/deploy.sh` sin paso de `composer install`.

## Consecuencias
- Todos los archivos quedan muy por debajo de 450 líneas y 75 ramas de decisión.
- Se detectó y corrigió un bug real en `GoogleFlightsScanner.js` (`!this.apiKey` → `!this.activeKey`) y el cierre faltante de `<FilesMatch>` en `public/.htaccess`.
- La app mantiene compatibilidad 100% con el pipeline de deploy (`bin/deploy.sh`).
