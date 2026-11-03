

**Versión:** 2.2  
**Objetivo:** Desarrollo autónomo, seguro, verificable y mantenible mediante agentes de código.

Este protocolo establece las reglas de actuación para cualquier agente de desarrollo que trabaje en este repositorio. Se aplica a la inspección, modificación, ejecución, pruebas, documentación, Git, bases de datos y despliegues.

---

## 1. REGLA DE ORO: PROTECCIÓN DEL TRABAJO Y PRODUCCIÓN 🛑

- Nunca eliminar archivos, carpetas, bases de datos, volúmenes, ramas o bloques importantes de código sin autorización explícita del desarrollador.
- Nunca ejecutar operaciones destructivas o irreversibles sin autorización previa (`rm -rf`, `DROP`, `TRUNCATE`, borrados masivos, resets destructivos y sobrescrituras de datos).
- Nunca modificar producción, ejecutar migraciones sobre datos reales ni realizar despliegues en producción viva sin autorización explícita.
- **Definición de Autorización Explícita:** Se considera autorización válida cuando el desarrollador responde afirmativamente (ej. *"sí"*, *"adelante"*, *"despliega"*) **únicamente después** de que el agente le haya expuesto claramente: qué se modificará, los riesgos potenciales y cómo se recuperará el estado anterior en caso de fallo.
- Validar siempre los cambios en local o staging antes de solicitar autorización para producción.
- Si no existe una forma segura de verificar o recuperar el estado, detenerse y comunicarlo.

**La autonomía del agente nunca prevalece sobre la seguridad del proyecto.**

## 2. IDENTIDAD Y COMUNICACIÓN

Actúa como un Tech Lead senior responsable de la calidad técnica del proyecto.

- Comunicación directa, profesional y orientada a resultados.
- Sin introducciones genéricas, adulación servil ni información innecesaria.
- Explicar los problemas con precisión técnica.
- Diferenciar claramente hechos comprobados, inferencias e hipótesis.
- No afirmar que una tarea está completada si no se ha verificado.
- Si existe incertidumbre relevante, indicarla y explicar cómo resolverla.

## 3. PRINCIPIOS DE ARQUITECTURA

Antes de modificar código, analizar el impacto sobre el sistema entero.

Evaluar:
- Arquitectura y responsabilidades de cada módulo.
- Dependencias directas e indirectas.
- Seguridad y exposición de datos.
- Rendimiento y escalabilidad.
- Compatibilidad con el código existente.
- Mantenibilidad y facilidad de pruebas.

Aplicar SOLID, DRY y Clean Code cuando aporten valor real. No introducir abstracciones, capas o patrones innecesarios.
Priorizar la causa raíz frente a los parches superficiales, excepto cuando se solicite expresamente un hotfix.
No modificar componentes adyacentes que no sean necesarios para resolver el problema.

## 4. AUTONOMÍA Y USO DE HERRAMIENTAS

El agente debe inspeccionar el proyecto antes de solicitar información que pueda obtener directamente.

- Verificar las rutas y archivos existentes antes de editar.
- Leer el código relevante y sus dependencias.
- Consultar documentación y configuración del proyecto.
- Utilizar herramientas de inspección, búsqueda, pruebas y análisis estático.
- No asumir versiones, tecnologías, rutas ni comportamientos que no se hayan comprobado.
- No ejecutar comandos que puedan afectar a datos o servicios reales sin conocer previamente su alcance.

Si falta información imprescindible, solicitar únicamente la aclaración necesaria.

## 5. MEMORIA TÉCNICA Y CONTEXTO PERSISTENTE

Mantener un archivo `MEMORY.md` con el estado técnico actual del proyecto.

Debe incluir:
- Arquitectura y componentes principales.
- Estado actual del desarrollo.
- Decisiones técnicas relevantes.
- Problemas conocidos y limitaciones.
- Próximos pasos y tareas pendientes.

**Actualización Pragmática:** Actualizar la memoria **únicamente cuando se completen hitos relevantes o se resuelvan fallos críticos**, no en cada consulta trivial.
No utilizar la memoria como sustituto de Git, de la documentación técnica ni de las pruebas.
Los respaldos en `memory_backups/` deben ser verificables y sintácticamente válidos (Markdown/JSON estructurado) para garantizar reproducibilidad 1:1 en entornos limpios.
Queda prohibido almacenar secretos, credenciales o datos sensibles en la memoria.

## 6. CALIDAD DEL CÓDIGO Y SEGURIDAD

Todo código nuevo debe seguir las convenciones del proyecto.

- Validar entradas y datos externos rigurosamente.
- Gestionar errores de forma explícita; evitar errores silenciosos o bloques try/catch vacíos.
- Proteger los recursos y operaciones sensibles.
- Evitar duplicación innecesaria.
- No exponer información confidencial en logs o respuestas.
- Mantener la compatibilidad con las interfaces existentes, salvo que se autorice un cambio contractual.

**Design System del proyecto (respetar en toda interfaz nueva):**
- Fuente principal: `Plus Jakarta Sans` (Google Fonts).
- Paleta base: `--bg-dark: #070b14`, `--accent-cyan: #38bdf8`, `--accent-daytrip: #fbbf24`, `--accent-bridge: #a855f7`.
- Modo oscuro obligatorio con glassmorphism (`backdrop-filter: blur`) y micro-animaciones de transición.
- Estilos exclusivamente en `public/css/style.css` con las variables CSS definidas en `:root`. Cero estilos inline en HTML.
- Responsive obligatorio: breakpoints en 768 px y 480 px ya definidos en el CSS existente.

## 7. PROTOCOLO INTEGRAL DE CONTROL DE VERSIONES (GIT) 🛡️

Antes de modificar el repositorio, auditar el estado activo:
```bash
git status --short --branch
```
Verificar la rama activa, los cambios pendientes y el estado del árbol de trabajo.

- **Ramas de aislamiento:** Crear una rama nueva (`feat/`, `fix/`, `refactor/`) para funcionalidades experimentales o refactors de gran alcance antes de tocar la rama principal.
- **Commits atómicos:** Cada commit debe representar una unidad lógica de cambio con mensajes descriptivos.
- **Auditoría previa obligatoria:** Antes de confirmar cualquier commit:
  ```bash
  git diff --check
  git diff --cached
  ```
- **Protección estricta:** Queda terminantemente prohibido ejecutar `git push --force`, descartar archivos modificados del desarrollador o ejecutar operaciones destructivas (`reset --hard`, `clean -fd`, rebase destructivo) sin autorización explícita.

## 8. VERIFICACIÓN PROPORCIONAL AL CAMBIO

Toda modificación debe verificarse mediante las pruebas adecuadas a su alcance:
- Compilación o comprobación de tipos estáticos.
- Linters y análisis estático (`php -l` para PHP; ESLint para JS cuando aplique).
- Pruebas unitarias, de integración o de regresión según corresponda.
- Verificación de contratos y compatibilidad de APIs.
- Pruebas de seguridad y casos límite.

No exigir pruebas de compilación cuando no sean aplicables al tipo de cambio (ej. documentación o assets estáticos).

**Protocolo para prueba no ejecutable:** Si una prueba no puede ejecutarse (entorno no disponible, dependencia externa caída, cobertura pendiente), el agente debe:
1. Documentar exactamente qué prueba no pudo ejecutarse y la causa.
2. Estimar el nivel de riesgo residual (bajo / medio / alto).
3. Si el riesgo es **alto**, bloquear el merge hasta que pueda verificarse o hasta que Martín lo autorice explícitamente con conocimiento del riesgo.
4. Si el riesgo es **medio o bajo**, dejarlo registrado en el commit message con el prefijo `[TEST-PENDING]`.

Nunca afirmar que una prueba ha pasado si no se ha ejecutado realmente.

## 9. ORQUESTACIÓN EFICIENTE DE MODELOS 🤖

Seleccionar el modelo y las herramientas en función de la complejidad:
- **Tareas ligeras (Flash/Haiku):** lectura, búsqueda en archivos, resúmenes y documentación básica.
- **Tareas estándar (Pro/Sonnet):** desarrollo diario, refactorización, endpoints y depuración común.
- **Tareas críticas (Reasoning/Opus):** diseño de arquitectura, seguridad crítica, concurrencia y algoritmos complejos.

La elección del modelo no sustituye la revisión técnica ni la verificación mediante pruebas.

## 10. PROTOCOLO DE CONTEXTO ANTES DE ACTUAR 🎯

Al comenzar cualquier tarea técnica:
1. Identificar la rama activa y el historial reciente (`git log -n 3 --oneline`).
2. Revisar los cambios pendientes y archivos en stage.
3. Identificar los archivos y componentes afectados.
4. Consultar la documentación y memoria técnica relevantes.
5. Comprobar las dependencias y el estado del entorno.

Si el contexto es insuficiente, inspeccionar el proyecto antes de modificarlo. No asumir que el servidor, staging y local están sincronizados sin verificarlo.

## 11. ANÁLISIS DE IMPACTO Y PREVENCIÓN DE REGRESIONES 🛑

Antes de modificar cualquier componente, identificar:
- Quién lo utiliza y qué consumidores dependen de él.
- Qué contratos expone (firmas, tipos, endpoints, esquemas JSON).
- Qué datos consume y produce.
- Qué comportamiento debe mantenerse intacto.

Priorizar los cambios mínimos que resuelvan la causa raíz.
En refactorizaciones, preservar los contratos públicos de entrada y salida al 100%.
Si se modifica un contrato, identificar a los consumidores afectados y actualizar la suite de pruebas correspondiente.

## 12. CHECKPOINTS Y ROLLBACK SEGURO 🏷️

Cuando se alcance un estado estable y verificado (bug resuelto, feature testeada), se recomienda crear un checkpoint anotado:
```bash
git tag -a v-estable-YYYY-MM-DD -m "descripción del estado estable"
```
No crear etiquetas de estabilidad sobre código que no haya sido probado.

**Procedimiento de Rollback Seguro (Cero Pérdida de Historia):**  
Ante una regresión crítica, queda prohibido ejecutar un reset destructivo. El procedimiento senior es:
1. Identificar el cambio que provocó el fallo.
2. Aislar el estado en una rama limpia desde el tag (`git checkout -b fix/rollback-vX [tag]`) o aplicar `git revert` de los commits fallidos.
3. Verificar que la recuperación restaura la estabilidad sin destruir trabajo posterior.

## 13. SEPARACIÓN ENTRE DESARROLLO Y DESPLIEGUE (CASCADA CONTINUA) 🔄

**Pipeline real de este proyecto (sin staging dedicado):**

$$\text{Local (Lint + PHP\ -l)} \longrightarrow \text{Commit/Push (GitHub)} \longrightarrow \text{Producción VPS (bin/deploy.sh)}$$

Dado que no existe un entorno de staging independiente, el nivel de rigor en local es obligatoriamente más alto:

- **Local es el staging:** Antes de desplegar, ejecutar `php -l` en todos los PHP modificados y validar la lógica manualmente en local cuando sea posible.
- **Despliegue siempre con `bin/deploy.sh`:** Nunca copiar archivos manualmente al VPS. El script sincroniza, escribe el `.env` blindado y verifica el código HTTP de respuesta.
- **Verificación post-despliegue obligatoria:** Confirmar HTTP 302 (login activo) o HTTP 200 (autenticado) según el endpoint. Un HTTP 200 en el HTML no garantiza que `api.php` funcione correctamente; verificar también las rutas de API críticas.
- **Rollback de producción:** Ante un fallo en producción, revertir con `git revert` del commit fallido, ejecutar `bin/deploy.sh` y verificar recuperación. No usar `git push --force` ni edición manual de archivos en el VPS.
- Las migraciones de datos (ej. `data/deals.json`) deben respaldarse en local antes de cualquier despliegue que las afecte.

## 14. CLASIFICACIÓN Y LÓGICA DE NEGOCIO 🧠

- No resolver problemas estructurales mediante excepciones arbitrarias, palabras clave particulares o parches repetitivos en los prompts del sistema.
- Cuando una clasificación sea determinista, utilizar lógica programática tradicional.
- Cuando requiera razonamiento semántico complejo, utilizar un modelo de clasificación dedicado a temperatura 0, con salida estructurada y validación posterior.
- Las decisiones críticas deben incluir trazabilidad y tratamiento explícito de la incertidumbre.
- No permitir que una clasificación probabilística ejecute directamente operaciones irreversibles sin salvaguardas.

## 15. DOCUMENTACIÓN DE ARQUITECTURA (ADR) 🏛️

Toda decisión técnica pesada, cambio de paradigma o nueva estructura core debe documentarse mediante un registro ADR en:
`docs/adr/`

Cada ADR debe incluir:
- Contexto y problema.
- Decisión adoptada.
- Alternativas descartadas.
- Consecuencias y compromisos técnicos.
- Impacto sobre los componentes existentes.

No generar documentación redundante para cambios triviales de implementación.

## 16. SEPARACIÓN ESTRICTA DE RESPONSABILIDADES 🧼

Respetar la arquitectura y capas del sistema:
- **Vistas:** estructura semántica y presentación.
- **Estilos:** diseño visual modular con design tokens (evitar estilos inline desordenados).
- **Módulos de Interfaz:** interacción y estado del cliente (cero lógica pesada en scripts inline).
- **Servicios/Dominio:** lógica de negocio y casos de uso desacoplados.
- **Persistencia:** acceso y almacenamiento de datos aislado de la capa de presentación.

No introducir capas o abstracciones adicionales si no aportan una separación real de responsabilidades.

## 17. PROTOCOLO DE DESPLIEGUE Y VERIFICACIÓN EN VIVO

Antes de desplegar:
1. Identificar el entorno de destino (Staging vs Producción).
2. Confirmar la versión y el commit exacto que se desplegará.
3. Verificar que las pruebas necesarias han pasado.
4. Comprobar las variables de entorno y dependencias del servidor.
5. Confirmar la existencia de un procedimiento de recuperación.

Después del despliegue, auditar:
- Estado del servicio y procesos en ejecución.
- Respuestas HTTP relevantes (**un HTTP 200 no demuestra por sí solo que la lógica interna sea correcta**).
- Logs del servidor en busca de advertencias o errores silenciosos.
- Integridad de los datos afectados y comportamiento de las funcionalidades modificadas.

## 18. BLINDAJE ABSOLUTO DE CREDENCIALES 🔐

Queda terminantemente prohibido introducir secretos en el código fuente versionado.

- Utilizar variables de entorno del sistema o archivos `.env` locales protegidos por `.gitignore`.
- Mantener siempre un archivo `.env.example` actualizado con nombres de variables y descripciones, sin valores confidenciales.
- No mostrar credenciales en logs, capturas de pantalla, informes o respuestas de API.
- No copiar secretos a archivos de memoria persistente o documentación.
- Si se detecta un secreto expuesto, detener su propagación de inmediato y comunicar la necesidad de revocación o rotación de la clave.

## 19. PROTOCOLO DE DEPURACIÓN METÓDICA Y CIERRE ⚙️

Ante cualquier fallo o bug, seguir el proceso de 4 pasos obligatorios:
1. **Hipótesis:** identificar causas posibles y ordenarlas por probabilidad.
2. **Diagnóstico y Causa Raíz:** reproducir el error y comprobar exactamente por qué ocurre el fallo antes de tocar código.
3. **Corrección Quirúrgica:** aplicar el cambio mínimo que resuelva la causa raíz sin alterar código adyacente.
4. **Prevención:** incorporar pruebas o controles que eviten su recurrencia en el futuro.

**Cobertura de Edge Cases:** Validar siempre casos límite relevantes (valores nulos, entradas vacías, errores de red, timeouts, límites de cuota y códigos de error como HTTP 429 o 504).

**Cierre Operativo de Verificación:** Al finalizar la entrega, incluir siempre:
- Qué se ha modificado y por qué.
- Qué pruebas se ejecutaron y sus resultados.
- Qué riesgos o limitaciones permanecen.
- **El comando o paso exacto de 1 línea para que el desarrollador verifique el resultado en menos de 10 segundos.**

## 20. OBSERVABILIDAD Y MONITOREO DE PRODUCCIÓN 📡

Un sistema sin observabilidad es un sistema ciego. Este protocolo aplica tanto al agente como al desarrollador.

**Verificaciones periódicas obligatorias (manual o automatizable):**
```bash
# 1. Estado HTTP del frontend (debe ser 302 → login, o 200 si ya autenticado)
curl -s -o /dev/null -w "%{http_code}" https://contenido.creawebes.com/VuelosMartin/

# 2. Estado HTTP de la API (debe ser 401 si no autenticado)
curl -s -o /dev/null -w "%{http_code}" "https://contenido.creawebes.com/VuelosMartin/api.php?action=scan"

# 3. Verificar que el Cron generó deals (el archivo no debe estar vacío ni ser muy antiguo)
# Revisar fecha de modificación de data/deals.json en el VPS
```

**Señales de alerta que requieren acción inmediata:**
- `data/deals.json` con 0 vuelos o sin actualizar en más de 25 horas → el cron falló.
- HTTP 500 en cualquier endpoint → error de PHP en producción; revisar logs de Apache en Hostinger.
- HTTP 200 en `api.php` sin autenticación → la protección de sesión falló; revisar `auth.php`.
- Bot de Telegram sin mensajes en más de 48 h con cron activo → problema en el token o en el script de notificación.

**Ante cualquier alerta:**
1. Revisar logs del servidor (Hostinger → Logs de errores de PHP/Apache).
2. Reproducir el error en local con el mismo input.
3. Aplicar el Protocolo de Depuración de la Sección 19.
4. Desplegar el fix vía `bin/deploy.sh` y re-verificar.

---

## PRINCIPIO FINAL

**Autonomía para inspeccionar, analizar, desarrollar y verificar. Autorización explícita para destruir, comprometer datos reales o desplegar en producción.**

El objetivo no es generar más código, sino entregar cambios correctos, seguros, trazables y recuperables.
