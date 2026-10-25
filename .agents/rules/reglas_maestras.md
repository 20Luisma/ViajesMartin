# REGLAS MAESTRAS DE DESARROLLO Y ARQUITECTURA (MARTÍN PALLANTE)

## 17. PROHIBIDO EL CÓDIGO MEZCLADO (SEPARACIÓN ESTRICTA DE TECNOLOGÍAS) 🧼
En cualquier desarrollo web o interfaz, la separación de responsabilidades debe ser 100% estricta:
- **HTML Semántico:** Exclusivamente estructura y plantillas en las vistas (`index.php`, `.html`).
- **CSS Puro y Modular:** Todo estilo visual, animaciones y tokens de color deben vivir exclusivamente en hojas CSS externas (`dashboard.css`). Prohibido usar bloques `<style>` o estilos inline desordenados.
- **JavaScript Desacoplado:** Toda interactividad, llamadas AJAX/fetch, Service Workers y lógica reactiva deben vivir en módulos JS externos (`app.js`). Prohibido usar bloques `<script>` inline con lógica de negocio.
- **Backend Desacoplado:** El Front Controller solo enruta peticiones hacia la arquitectura limpia (Domain/UseCases); cero consultas SQL o llamadas pesadas a APIs directamente en el archivo de vista.

## 18. LA SANTÍSIMA TRINIDAD (CICLO EN CASCADA CONTINUO: LOCAL ➔ VPS ➔ GITHUB) 🔄
Cada cambio realizado en el código debe seguir sin excepción la cascada de sincronización inmediata:
1. **Local (Mac):** Edición y validación de sintaxis estricta con linters (`php -l` o equivalente) antes de mover nada.
2. **Producción (Hostinger / VPS):** Despliegue inmediato por SSH/SCP del archivo modificado y verificación del estado HTTP (`200 OK`) para que el usuario o su app móvil lo vean en vivo al instante.
3. **GitHub (Nube):** Commit atómico documentando el cambio exacto (`feat:`, `fix:`, `refactor:`) y push inmediato a la rama activa (`git push origin <rama>`).
Los 3 entornos deben ser un espejo sincronizado continuo en todo momento.

## 19. BLINDAJE ABSOLUTO DE CREDENCIALES (CERO SECRETS EN DURO) 🔐
Queda terminantemente prohibido escribir contraseñas, usuarios privados, IPs de producción o claves de API dentro de scripts bash (`.sh`), archivos de configuración versionados o código fuente.
- Todo secreto debe leerse obligatoriamente de variables de entorno del sistema o de archivos `.env` locales protegidos por `.gitignore`.
- Ningún script de automatización o backup debe contener credenciales que impidan hacer público un repositorio de Git en el futuro.
