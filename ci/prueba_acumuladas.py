"""Prueba temporal: historial de tarjetas y amarillas acumuladas para la próxima suspensión."""
import json, subprocess, sys, urllib.request, urllib.error, datetime

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
    r = subprocess.run(["mysql", "-h127.0.0.1", "-uroot", "-proot", "liga_prueba", "-N", "-e", q], check=True, capture_output=True, text=True)
    return r.stdout.strip()

B = D["campB"]
org2 = llamar("POST", "/auth/login", cuerpo={"email": "org2@prueba.ec", "password": "clave123"})[1]["token"]
_, t0 = llamar("GET", f"/campeonatos/{B}/estadisticas/tarjetas", org2)
L = t0["amarillasParaSuspension"]
esperar("el servidor informa el límite de acumulación", L == 5, str(L))

_, camp = llamar("GET", f"/campeonatos/{B}", org2)
local, visita = [e["idEquipo"] for e in camp["equipos"]][:2]
jug = [j["idJugador"] for j in llamar("GET", f"/equipos/{local}", org2)[1]["jugadores"]]
P1, P2 = jug[-1], jug[-2]
inst = sql(f"SELECT id_instancia FROM jornada WHERE id_campeonato={B} LIMIT 1")
hoy = datetime.date.fromisoformat(D["hoy"])

def partido(k, tarjetas):
    """Partido jugado k (en su propia jornada) con tarjetas [(jugador, tipo), ...]."""
    fecha = (hoy - datetime.timedelta(days=40 - k)).isoformat() + " 10:00:00"
    idp = sql(f"INSERT INTO jornada (numero,id_campeonato,id_instancia) VALUES ({200 + k},{B},{inst}); SET @j=LAST_INSERT_ID(); "
              f"INSERT INTO partido (id_jornada,id_equipo_local,id_equipo_visitante,fecha,jugado,desierto,perdida_reglamento,goles_local,goles_visitante,created_at,updated_at) "
              f"VALUES (@j,{local},{visita},'{fecha}',1,0,0,1,0,NOW(),NOW()); SELECT LAST_INSERT_ID();")
    for j, tipo in tarjetas:
        sql(f"INSERT INTO eventopartido (id_partido,id_jugador,tipo_evento,minuto,created_at) VALUES ({idp},{j},'{tipo}',30,NOW())")

A, R = "TARJETA_AMARILLA", "TARJETA_ROJA"
P3 = jug[-3]
_, eq0 = llamar("GET", f"/campeonatos/{B}/estadisticas/tarjetas", org2)
fp0 = next((x for x in eq0["porEquipo"] if x["idEquipo"] == local), {"amarillas": 0, "rojas": 0, "puntosFairPlay": 0})
for k in range(1, L + 1):                      # P1: L amarillas en L partidos → suspensión y la cuenta vuelve a 0
    partido(k, [(P1, A)] + ([(P2, A)] if k < L else []))   # P2: L-1 amarillas → a una de la suspensión
partido(L + 1, [(P1, A)])                      # P1: 1 en el ciclo nuevo
partido(L + 2, [(P1, A), (P1, A), (P1, R)])    # P1: doble amarilla → no suma
partido(L + 3, [(P1, A), (P1, R)])             # P1: amarilla y roja directa → la amarilla suma
partido(L + 4, [(P3, A), (P3, A)])             # P3: doble amarilla SIN roja registrada

_, t = llamar("GET", f"/campeonatos/{B}/estadisticas/tarjetas", org2)
f1 = next(x for x in t["porJugador"] if x["idJugador"] == P1)
f2 = next(x for x in t["porJugador"] if x["idJugador"] == P2)
esperar("historial completo: P1 con todas sus amarillas", f1["amarillas"] == L + 1 + 2 + 1, str(f1))
esperar("historial completo: P1 con sus rojas", f1["rojas"] == 2, str(f1))
esperar("acumuladas: P1 tiene 2 (la suspensión reinició la cuenta; la doble amarilla no suma)", f1["amarillasAcumuladas"] == 2, str(f1))
esperar(f"acumuladas: P2 tiene {L - 1}, a una de la suspensión", f2["amarillasAcumuladas"] == L - 1 and f2["amarillas"] == L - 1, str(f2))

f3 = next(x for x in t["porJugador"] if x["idJugador"] == P3)
esperar("doble amarilla sin roja registrada: el historial cuenta 1 roja", f3["amarillas"] == 2 and f3["rojas"] == 1 and f3["total"] == 3 and f3["rojasPorDobleAmarilla"] == 1, str(f3))
esperar("doble amarilla sin roja: no suma a acumuladas", f3["amarillasAcumuladas"] == 0, str(f3))
esperar("doble amarilla CON roja registrada: no se cuenta dos veces", f1["rojas"] == 2 and f1["rojasPorDobleAmarilla"] == 0, str(f1))
fp = next(x for x in t["porEquipo"] if x["idEquipo"] == local)
# Tarjetas nuevas del equipo local: P1 9A+2R, P2 (L-1)A, P3 2A + 1 roja por doble amarilla.
nuevasA, nuevasR = (L + 1 + 2 + 1) + (L - 1) + 2, 2 + 1
esperar("fair play: la doble amarilla suma su roja al equipo",
        fp["amarillas"] - fp0["amarillas"] == nuevasA and fp["rojas"] - fp0["rojas"] == nuevasR
        and fp["puntosFairPlay"] - fp0["puntosFairPlay"] == nuevasA + 3 * nuevasR, f"{fp} vs {fp0}")
_, s = llamar("GET", f"/campeonatos/{B}/estadisticas/suspensiones", org2)
esperar("Suspensiones: P3 tiene la sanción por doble amarilla", any(x["idJugador"] == P3 and x["motivo"] == "Doble amarilla" for x in s["sanciones"]))
esperar("Suspensiones: P1 tiene la sanción por acumulación", any(x["idJugador"] == P1 and "acumuladas" in x["motivo"] for x in s["sanciones"]), str([x for x in s["sanciones"] if x["idJugador"] == P1])[:300])
riesgo = {r["idJugador"]: r["amarillasAcumuladas"] for r in s["enRiesgo"]}
esperar("Suspensiones: P2 en riesgo con el mismo número que Tarjetas", riesgo.get(P2) == f2["amarillasAcumuladas"], str(riesgo))
esperar("Suspensiones: P1 no está en riesgo", P1 not in riesgo, str(riesgo))
esperar("todos los jugadores en riesgo coinciden con su columna Acumuladas",
        all(next(x["amarillasAcumuladas"] for x in t["porJugador"] if x["idJugador"] == j) == n for j, n in riesgo.items()))

print("\nRESUMEN", "TODO OK" if not fallas else f"{len(fallas)} fallas")
sys.exit(1 if fallas else 0)
