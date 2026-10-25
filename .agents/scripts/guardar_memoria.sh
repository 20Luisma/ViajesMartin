#!/bin/bash
FECHA=$(date +"%Y-%m-%d_%H-%M")
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
mkdir -p "$DIR/memory_backups"
cp "$DIR/MEMORY.md" "$DIR/memory_backups/MEMORY_${FECHA}.md"
echo "Backup de memoria guardado: memory_backups/MEMORY_${FECHA}.md"
