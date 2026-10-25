#!/bin/bash
# ==============================================================================
# Vuelos Martín — Script de Despliegue Seguro a Hostinger VPS
# Cero secretos hardcodeados: lee variables exclusivamente de .env
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: No se encontró el archivo .env en $ENV_FILE"
    exit 1
fi

# Cargar variables de entorno
export $(grep -v '^#' "$ENV_FILE" | xargs)

if [ -z "$VPS_HOST" ] || [ -z "$VPS_USER" ] || [ -z "$VPS_PASS" ] || [ -z "$VPS_REMOTE_PATH" ]; then
    echo "❌ Error: Faltan variables de configuración VPS en .env"
    exit 1
fi

VPS_PORT="${VPS_PORT:-22}"

echo "========================================================"
echo "🚀 Iniciando despliegue de Vuelos Martín a Producción"
echo "🌐 Destino: $VPS_USER@$VPS_HOST:$VPS_REMOTE_PATH"
echo "========================================================"

# 1. Crear carpeta remota si no existe
echo "📁 Verificando carpeta remota en VPS..."
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "mkdir -p $VPS_REMOTE_PATH"

# 2. Sincronizar directorio public/ hacia el VPS
echo "🔄 Sincronizando archivos públicos..."
sshpass -p "$VPS_PASS" rsync -avz --delete \
    -e "ssh -p $VPS_PORT -o StrictHostKeyChecking=no" \
    "$DIR/public/" \
    "$VPS_USER@$VPS_HOST:$VPS_REMOTE_PATH/"

# 3. Sincronizar variables de runtime para api.php de forma blindada (chmod 600)
echo "🔐 Sincronizando credenciales de runtime en VPS..."
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "cat << 'EOF' > $VPS_REMOTE_PATH/.env
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID=$TELEGRAM_CHAT_ID
RAPIDAPI_KEY=$RAPIDAPI_KEY
EOF
chmod 600 $VPS_REMOTE_PATH/.env"

echo "========================================================"
echo "✅ Despliegue completado con éxito."
echo "🔗 Verificando HTTP 200 en https://contenido.creawebes.com/VuelosMartin/ ..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://contenido.creawebes.com/VuelosMartin/)
echo "📡 Estado HTTP en Producción: $HTTP_STATUS"
echo "========================================================"
