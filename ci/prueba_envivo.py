"""Prueba temporal: marcadores en vivo (reloj del vocal + consulta del enlace público y del dirigente)."""
import json, subprocess, sys, datetime, urllib.request, urllib.error, random

BASE = "http://localhost:5080/api"
D = json.load(open(sys.argv[1]))
fallas = []

def llamar(metodo, ruta, token=None, cuerpo=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo, headers={"Content-Type": "application/json"})
    if token: req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r:
            t = r.read().decode(); return r.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try: return e.code, json.loads(t)
        except Exception: return e.code, t

def esperar(nombre, cond, detalle=""):
    print(("OK   " if cond else "FALLA ") + nombre + (f" — {detalle}" if detalle and not cond else ""))
    if not cond: fallas.append(nombre)

def sql(q):
    return subprocess.run(["mysql", "-h127.0.0.1", "-uroot", "-proot", "liga_prueba", "-N", "-e", q], check=True, capture_output=True, text=True).stdout.strip()

A, B = D["campA"], D["campB"]
login = lambda e: llamar("POST", "/auth/login", cuerpo={"email": e, "password": "clave123"})[1]["token"]
org1, org2 = login("org1@prueba.ec"), login("org2@prueba.ec")

# Partido de hoy (hora de Ecuador) en una jornada nueva de A.
ahora_ec = datetime.datetime.now(datetime.UTC).replace(tzinfo=None) - datetime.timedelta(hours=5)
_, camp = llamar("GET", f"/campeonatos/{A}", org1)
local, visita = [e["idEquipo"] for e in sorted(camp["equipos"], key=lambda e: e["nombre"])]
inst = llamar("GET", "/catalogos/instancias", org1)[1][0]["idInstancia"]
_, j = llamar("POST", f"/campeonatos/{A}/jornadas", org1, {"numero": random.randint(20000, 99999), "idInstancia": inst, "idGrupo": None})
est = llamar("GET", "/estadios", org1)[1][0]["idEstadio"]
s, p = llamar("POST", f"/jornadas/{j['idJornada']}/partidos", org1, {"idEquipoLocal": local, "idEquipoVisitante": visita, "fecha": ahora_ec.strftime("%Y-%m-%dT%H:%M"), "idEstadio": est, "idArbitro": None})
esperar("se crea un partido para hoy", s in (200, 201), f"{s} {str(p)[:200]}")
P = p["idPartido"]
jl = llamar("GET", f"/equipos/{local}", org1)[1]["jugadores"]
jv = llamar("GET", f"/equipos/{visita}", org1)[1]["jugadores"]
goleador, rival = jl[0], jv[0]
sql(f"UPDATE persona pe JOIN jugador j ON j.id_persona = pe.id_persona SET pe.nombre = 'Carlos Andrés', pe.apellido = 'Mendoza Pérez', pe.foto_url = '/api/imagenes/0123456789abcdef0123456789abcdef' WHERE j.id_jugador = {goleador['idJugador']}")

tok = llamar("POST", f"/campeonatos/{A}/enlace-publico", org1)[1]["token"]
def publico():
    s, r = llamar("GET", f"/publico/{tok}/en-vivo")
    return s, r, next((x for x in (r or {}).get("partidos", []) if x["idPartido"] == P), None)

# Antes de empezar.
s, r, x = publico()
esperar("público sin sesión: el partido de hoy aparece por jugar", s == 200 and x and x["estado"] == "PorJugar" and x.get("golesLocal") is None and x.get("reloj") is None and x["eventos"] == [], f"{s} {str(r)[:300]}")
esperar("trae la fecha de hoy de Ecuador", s == 200 and r["hoy"] == ahora_ec.strftime("%Y-%m-%d"), str(r and r.get("hoy")))

# Empieza: reloj corriendo en el 1.er tiempo, minuto 10.
llamar("PUT", f"/partidos/{P}/iniciar", org1)
s, _ = llamar("PUT", f"/partidos/{P}/reloj", org1, {"fase": "1T", "segundos": 600, "corriendo": True, "duracionMin": 25})
esperar("el organizador envía el reloj (204)", s == 204, str(s))
llamar("POST", f"/partidos/{P}/eventos", org1, {"idJugador": goleador["idJugador"], "tipoEvento": "GOL", "minuto": 11})
s, r, x = publico()
rel = (x or {}).get("reloj") or {}
esperar("en vivo: estado, marcador 1-0 y reloj corriendo", x and x["estado"] == "EnVivo" and x["golesLocal"] == 1 and x["golesVisitante"] == 0 and rel.get("fase") == "1T" and rel.get("corriendo") and 600 <= rel.get("segundos", 0) <= 640 and rel.get("duracionMin") == 25, str(x)[:400])
ev = (x or {}).get("eventos") or []
esperar("gol con minuto, nombre corto y lado", ev and ev[0] == {"minuto": 11, "tipo": "GOL", "jugador": "Carlos Mendoza", "lado": "local", "dobleAmarilla": False}, str(ev))
texto = json.dumps(r)
esperar("sin fotos, documentos ni fechas de nacimiento", "imagenes" not in texto and "foto" not in texto.lower() and "cedula" not in texto.lower() and "fechaNac" not in texto, texto[:200])

# Doble amarilla y gol en contra del visitante.
for t, m in (("TARJETA_AMARILLA", 15), ("TARJETA_AMARILLA", 20), ("GOL_EN_CONTRA", 22)):
    llamar("POST", f"/partidos/{P}/eventos", org1, {"idJugador": rival["idJugador"], "tipoEvento": t, "minuto": m})
s, r, x = publico()
ev = x["eventos"]
esperar("doble amarilla: roja del visitante", any(e["tipo"] == "ROJA" and e["lado"] == "visitante" and e["dobleAmarilla"] and e["minuto"] == 20 for e in ev), str(ev))
esperar("las amarillas sueltas no se muestran", not any(e["tipo"] == "TARJETA_AMARILLA" for e in ev), str(ev))
esperar("gol en contra suma al local: 2-0", x["golesLocal"] == 2 and x["golesVisitante"] == 0 and any(e["tipo"] == "GOL_EN_CONTRA" and e["lado"] == "local" for e in ev), str(x)[:300])
sql(f"UPDATE partido SET reloj_fase = reloj_fase WHERE id_partido = {P}")

# Medio tiempo.
s, _ = llamar("PUT", f"/partidos/{P}/reloj", org1, {"fase": "descanso", "segundos": 1530, "corriendo": False, "duracionMin": 25})
s, r, x = publico()
esperar("medio tiempo: fase descanso, reloj detenido", x["reloj"] == {"fase": "descanso", "segundos": 1530, "corriendo": False, "duracionMin": 25}, str(x["reloj"]))
llamar("PUT", f"/partidos/{P}/reloj", org1, {"fase": "2T", "segundos": 90, "corriendo": True, "duracionMin": 25})
s, r, x = publico()
esperar("2.º tiempo corriendo", x["reloj"]["fase"] == "2T" and x["reloj"]["corriendo"] and 90 <= x["reloj"]["segundos"] <= 130, str(x["reloj"]))
s, _ = llamar("PUT", f"/partidos/{P}/reloj", org1, {"fase": "2T", "segundos": 300, "corriendo": False, "duracionMin": 25})
s, r, x = publico()
esperar("pausa: el reloj queda quieto", x["reloj"]["corriendo"] is False and x["reloj"]["segundos"] == 300, str(x["reloj"]))
llamar("PUT", f"/partidos/{P}/reloj", org1, {"fase": "2T", "segundos": 300, "corriendo": True, "duracionMin": 25})

# Validaciones y permisos.
for nombre, cuerpo in (("fase inválida", {"fase": "3T", "segundos": 0, "corriendo": True}),
                       ("segundos negativos", {"fase": "1T", "segundos": -5, "corriendo": True}),
                       ("duración fuera de rango", {"fase": "1T", "segundos": 0, "corriendo": True, "duracionMin": 3})):
    s, _ = llamar("PUT", f"/partidos/{P}/reloj", org1, cuerpo)
    esperar(f"reloj: {nombre} (400)", s == 400, str(s))
s, _ = llamar("PUT", f"/partidos/{P}/reloj", org2, {"fase": "1T", "segundos": 0, "corriendo": True})
esperar("otro organizador no toca el reloj (400)", s == 400, str(s))
s, _ = llamar("PUT", f"/partidos/{P}/reloj", None, {"fase": "1T", "segundos": 0, "corriendo": True})
esperar("sin sesión no se toca el reloj (401)", s == 401, str(s))
s, _ = llamar("GET", "/publico/OtroCodigoQueNoExiste22/en-vivo")
esperar("código inventado (404)", s == 404, str(s))

# Dirigente del equipo local.
s, inv = llamar("POST", f"/campeonatos/{A}/dirigentes/invitaciones", org1, {"idEquipo": local})
s, ses = llamar("POST", f"/invitaciones-dirigente/{inv['codigo']}/aceptar", None, {"nombre": "Dirigente Vivo", "email": "dirvivo@prueba.ec", "password": "clave123"})
dvivo = ses["token"]
s, r = llamar("GET", f"/dirigente/campeonatos/{A}/en-vivo", dvivo)
xd = next((y for y in (r or {}).get("partidos", []) if y["idPartido"] == P), None)
esperar("el dirigente ve el mismo marcador y reloj", s == 200 and xd and xd["golesLocal"] == 2 and xd["reloj"]["fase"] == "2T", f"{s} {str(r)[:300]}")
s, _ = llamar("GET", f"/dirigente/campeonatos/{B}/en-vivo", dvivo)
esperar("el dirigente no ve otro campeonato (404)", s == 404, str(s))
s, _ = llamar("GET", f"/dirigente/campeonatos/{A}/en-vivo", org1)
esperar("un organizador no usa la ruta del dirigente (403)", s == 403, str(s))

# Cierre: queda «Final» con el marcador guardado y el reloj detenido.
s, _ = llamar("PUT", f"/partidos/{P}/cerrar", org1, {"observaciones": None})
s, r, x = publico()
esperar("cerrado: Final 2-0, reloj final detenido", x["estado"] == "Final" and x["golesLocal"] == 2 and x["reloj"]["fase"] == "final" and not x["reloj"]["corriendo"] and x["reloj"]["segundos"] >= 300, str(x)[:300])
esperar("en la base el reloj quedó en FINAL", sql(f"SELECT reloj_fase FROM partido WHERE id_partido = {P}") == "FINAL")
s, _ = llamar("PUT", f"/partidos/{P}/reloj", org1, {"fase": "2T", "segundos": 10, "corriendo": True})
esperar("cerrado: el reloj ya no cambia (400)", s == 400, str(s))

# Vocal (campeonato B): cerrado → 409; reabierto → 204; al cerrar queda FINAL.
vocal = login("vocalb@prueba.ec")
HB = D["hoyB"]
cerrado = llamar("GET", f"/partidos/{HB}", org2)[1]
if not (cerrado["jugado"] or cerrado["estadoRegistro"] == "Cerrado"):
    llamar("PUT", f"/vocal/partidos/{HB}/cerrar", vocal, {"observaciones": "x"})
s, _ = llamar("PUT", f"/vocal/partidos/{HB}/reloj", vocal, {"fase": "1T", "segundos": 60, "corriendo": True, "duracionMin": 40})
esperar("vocal: partido cerrado, el reloj no cambia (409)", s == 409, str(s))
llamar("PUT", f"/partidos/{HB}/reabrir", org2)
s, _ = llamar("PUT", f"/vocal/partidos/{HB}/reloj", vocal, {"fase": "1T", "segundos": 60, "corriendo": True, "duracionMin": 40})
esperar("vocal: con el partido abierto envía el reloj (204)", s == 204, str(s))
fila = sql(f"SELECT reloj_fase, reloj_duracion_min, reloj_desde IS NOT NULL FROM partido WHERE id_partido = {HB}").split()
esperar("vocal: queda en la base (PRIMER_TIEMPO, 40 min, corriendo)", fila == ["PRIMER_TIEMPO", "40", "1"], str(fila))
s, _ = llamar("PUT", f"/vocal/partidos/{P}/reloj", vocal, {"fase": "1T", "segundos": 60, "corriendo": True})
esperar("vocal: no toca partidos de otro campeonato", s in (400, 404, 409) and s != 204, str(s))
llamar("PUT", f"/vocal/partidos/{HB}/cerrar", vocal, {"observaciones": "Fin."})
esperar("vocal: al cerrar, el reloj queda en FINAL", sql(f"SELECT reloj_fase FROM partido WHERE id_partido = {HB}") == "FINAL")

print(f"RESUMEN {'TODO OK' if not fallas else str(len(fallas)) + ' FALLAS: ' + '; '.join(fallas)}")
sys.exit(1 if fallas else 0)
