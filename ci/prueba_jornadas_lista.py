"""Prueba temporal: la lista de jornadas trae fecha (primer partido) y jugados."""
import json, re, sys, urllib.request

BASE = "http://localhost:5080/api"
D = json.load(open(sys.argv[1]))
fallas = []

def llamar(metodo, ruta, token=None, cuerpo=None):
    req = urllib.request.Request(BASE + ruta, data=json.dumps(cuerpo).encode() if cuerpo is not None else None, method=metodo, headers={"Content-Type": "application/json"})
    if token: req.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())

def esperar(nombre, cond, detalle=""):
    print(("OK   " if cond else "FALLA ") + nombre + (f" — {detalle}" if detalle and not cond else ""))
    if not cond: fallas.append(nombre)

o1 = llamar("POST", "/auth/login", cuerpo={"email": "org1@prueba.ec", "password": "clave123"})["token"]
camps = llamar("GET", "/campeonatos", o1)
js = [j for c in camps for j in llamar("GET", f"/campeonatos/{c['idCampeonato']}/jornadas", o1)]
esperar("hay jornadas para revisar", len(js) > 0, str(len(js)))
esperar("cada jornada trae «fecha» y «jugados»", all("fecha" in j and isinstance(j.get("jugados"), int) for j in js), str(js[:2]))
esperar("jugados entre 0 y el total", all(0 <= j["jugados"] <= j["totalPartidos"] for j in js))
con = [j for j in js if j["totalPartidos"] > 0]
esperar("con partidos: fecha yyyy-MM-dd", con and all(re.fullmatch(r"\d{4}-\d{2}-\d{2}", j["fecha"] or "") for j in con), str(con[:2]))
esperar("sin partidos: fecha vacía", all(j["fecha"] is None for j in js if j["totalPartidos"] == 0))
# Comparar con el detalle de una jornada con partidos.
j = con[0]
det = llamar("GET", f"/jornadas/{j['idJornada']}", o1)
esperar("jugados coincide con el detalle", j["jugados"] == sum(1 for p in det["partidos"] if p["jugado"]), f"{j['jugados']} vs detalle")
esperar("fecha = día del primer partido", j["fecha"] == min(p["fecha"] for p in det["partidos"])[:10], f"{j['fecha']} vs {min(p['fecha'] for p in det['partidos'])}")
print(f"{len(fallas)} fallas")
sys.exit(1 if fallas else 0)
