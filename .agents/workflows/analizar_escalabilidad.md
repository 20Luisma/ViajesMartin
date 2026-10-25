---
description: Analiza la escalabilidad, arquitectura y código espagueti del proyecto
---
# Analizando Escalabilidad del Proyecto (God Mode)

1. Ejecuta el script de recolección de métricas: `bash .agents/scripts/metricas_escalabilidad.sh`.
// turbo
2. Lee silenciosamente los resultados crudos en `.agents/reports/raw_metrics.json`.
3. Escanea superficialmente con `list_dir` y `view_file` los posibles "God Objects" o los directorios core (como `/src`, `/app` o la raíz) para ver si se cumplen los principios SOLID y de Clean Architecture definidos en `MEMORY.md`.
4. Si encuentras inconsistencias o bloqueos para escalar, identifícalos.
5. Genera un reporte premium en `.agents/reports/Auditoria_Escalabilidad_$(date +"%Y-%m-%d").md`. El reporte tiene que ser claro, con tono Tech Lead uruguayo ("che, esto está medio atado con alambre"), usar bloques de código, y Mermaid si ayuda a visualizar un acoplamiento.
6. Notifica a Martín (usando `notify_user`) con el link al archivo del reporte. Decile las postas.
