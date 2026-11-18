#!/usr/bin/env bash
# Copia, comprueba, restaura de prueba y cifra la base de datos.
# Lo usa el workflow «Respaldo semanal» (y las pruebas, con una base local).
#
# Variables de entrada:
#   URL            mysql://usuario:clave@host:puerto/base  (la base a copiar)
#   CLAVE          frase para cifrar (24 caracteres o más)
#   PRUEBA_HOST    servidor MySQL vacío para la prueba de restauración (por defecto 127.0.0.1)
#   PRUEBA_PUERTO  su puerto (por defecto 3307)
#   PRUEBA_CLAVE   clave de root de ese servidor (por defecto «prueba»)
#   SALIDA         carpeta donde queda la copia cifrada (por defecto la actual)
#   RESUMEN        archivo donde se escribe la tabla de filas (por defecto $GITHUB_STEP_SUMMARY o /dev/stdout)
# Deja el nombre del archivo cifrado en la última línea de la salida.
set -euo pipefail

: "${URL:?Falta URL}"
: "${CLAVE:?Falta CLAVE}"
PRUEBA_HOST="${PRUEBA_HOST:-127.0.0.1}"
PRUEBA_PUERTO="${PRUEBA_PUERTO:-3307}"
PRUEBA_CLAVE="${PRUEBA_CLAVE:-prueba}"
SALIDA="${SALIDA:-.}"
RESUMEN="${RESUMEN:-${GITHUB_STEP_SUMMARY:-/dev/stdout}}"

if [ ${#CLAVE} -lt 24 ]; then
  echo "::error::La clave de cifrado es muy corta: use al menos 24 caracteres aleatorios." >&2
  exit 1
fi

TRABAJO=$(mktemp -d)
CNF="$TRABAJO/origen.cnf"
trap 'rm -rf "$TRABAJO"' EXIT

# La clave de la base va en un archivo de opciones, nunca en la línea de comandos.
BASE=$(URL="$URL" CNF="$CNF" python3 - <<'PY'
import os, urllib.parse
u = urllib.parse.urlparse(os.environ["URL"])
with open(os.environ["CNF"], "w") as f:
    f.write("[client]\n")
    f.write(f"host={u.hostname}\nport={u.port or 3306}\n")
    f.write(f"user={urllib.parse.unquote(u.username or '')}\n")
    f.write(f"password=\"{urllib.parse.unquote(u.password or '')}\"\n")
print(u.path.lstrip("/") or "railway")
PY
)
chmod 600 "$CNF"

FECHA=$(date -u +%F)
SQL="$TRABAJO/respaldo.sql"

# 1. Copia.
mysqldump --defaults-extra-file="$CNF" \
  --single-transaction --quick --routines --triggers --events \
  --set-gtid-purged=OFF --no-tablespaces --column-statistics=0 \
  --databases "$BASE" > "$SQL"

# 2. Una copia completa termina con esta línea; si no está, se cortó.
if ! tail -n 1 "$SQL" | grep -q -- "-- Dump completed"; then
  echo "::error::La copia quedó incompleta." >&2
  exit 1
fi
echo "Copia de «$BASE»: $(du -h "$SQL" | cut -f1)" >&2

# 3. Prueba de restauración en una base vacía.
mysql -h"$PRUEBA_HOST" -P"$PRUEBA_PUERTO" -uroot -p"$PRUEBA_CLAVE" -e "DROP DATABASE IF EXISTS \`$BASE\`" 2>/dev/null
mysql -h"$PRUEBA_HOST" -P"$PRUEBA_PUERTO" -uroot -p"$PRUEBA_CLAVE" < "$SQL" 2>/dev/null
contar() { mysql -h"$PRUEBA_HOST" -P"$PRUEBA_PUERTO" -uroot -p"$PRUEBA_CLAVE" -N -e "SELECT COUNT(*) FROM \`$BASE\`.\`$1\`" 2>/dev/null || echo "—"; }
{
  echo "### Respaldo del $FECHA"
  echo ""
  echo "Restaurado en una base vacía. Filas por tabla:"
  echo ""
  echo "| Tabla | Filas |"
  echo "| --- | --- |"
  for t in usuario campeonato equipo jugador jornada partido eventopartido pago abono; do
    echo "| $t | $(contar "$t") |"
  done
  echo ""
  echo "Disparadores restaurados: $(mysql -h"$PRUEBA_HOST" -P"$PRUEBA_PUERTO" -uroot -p"$PRUEBA_CLAVE" -N -e "SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA='$BASE'" 2>/dev/null)"
} >> "$RESUMEN"
if [ "$(contar campeonato)" = "—" ] || [ "$(contar campeonato)" -lt 1 ]; then
  echo "::error::La copia restaurada no tiene campeonatos." >&2
  exit 1
fi
mysql -h"$PRUEBA_HOST" -P"$PRUEBA_PUERTO" -uroot -p"$PRUEBA_CLAVE" -e "DROP DATABASE \`$BASE\`" 2>/dev/null

# 4. Cifrado (AES-256). Solo sale la copia cifrada.
gzip -9 "$SQL"
ARCHIVO="$SALIDA/ligamanager-$FECHA.sql.gz.gpg"
gpg --batch --yes --symmetric --cipher-algo AES256 --pinentry-mode loopback \
    --passphrase-fd 3 --output "$ARCHIVO" "$SQL.gz" 3<<< "$CLAVE"
echo "Copia cifrada: $(du -h "$ARCHIVO" | cut -f1)" >&2
echo "$ARCHIVO"
