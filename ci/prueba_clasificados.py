"""Prueba temporal: sin fase configurada no hay clasificados; con fase, sí."""
import json, subprocess, sys, urllib.request, urllib.error

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
    subprocess.run(["mysql", "-h127.0.0.1", "-uroot", "-proot", "liga_prueba", "-e", q], check=True, capture_output=True)

def marcas(tabla):
    return [p["clasificado"] for g in tabla["grupos"] for p in g["posiciones"]]

B = D["campB"]
org2 = llamar("POST", "/auth/login", cuerpo={"email": "org2@prueba.ec", "password": "clave123"})[1]["token"]
_, fases = llamar("GET", f"/campeonatos/{B}/fases", org2)
esperar("el campeonato B no tiene fases", fases == [], str(fases))

_, t = llamar("GET", f"/campeonatos/{B}/estadisticas/posiciones", org2)
esperar("sin fase y sin grupos: ningún clasificado", len(marcas(t)) > 0 and not any(marcas(t)), str(t)[:300])

_, camp = llamar("GET", f"/campeonatos/{B}", org2)
eqs = [e["idEquipo"] for e in camp["equipos"]][:2]
s, g = llamar("POST", f"/campeonatos/{B}/grupos", org2, {"nombre": "Z"})
idG = g["idGrupo"]
for e in eqs: llamar("POST", f"/grupos/{idG}/equipos/{e}", org2)
sql(f"DELETE FROM posicion_grupo WHERE id_grupo={idG}; "
    f"INSERT INTO posicion_grupo (id_grupo,id_equipo,pj,pg,pe,pp,gf,gc,pts) VALUES ({idG},{eqs[0]},2,2,0,0,5,1,6),({idG},{eqs[1]},2,0,0,2,1,5,0)")

_, gd = llamar("GET", f"/grupos/{idG}", org2)
esperar("sin fase: la tabla del grupo no marca clasificados", len(gd["posiciones"]) == 2 and not any(p["clasificado"] for p in gd["posiciones"]), str(gd["posiciones"]))
_, t = llamar("GET", f"/campeonatos/{B}/estadisticas/posiciones", org2)
esperar("sin fase: Reportes → Posiciones no marca clasificados", len(marcas(t)) > 0 and not any(marcas(t)), str(t)[:300])
_, tg = llamar("GET", f"/campeonatos/{B}/posiciones", org2)
esperar("tabla general: ningún clasificado", isinstance(tg, list) and not any(p["clasificado"] for p in tg), str(tg)[:200])

inst = llamar("GET", "/catalogos/instancias", org2)[1][0]["idInstancia"]
s, f = llamar("POST", f"/campeonatos/{B}/fases", org2, {"idInstancia": inst, "orden": 1, "formato": "GRUPOS", "equiposClasifican": 1})
esperar("org2 configura una fase con 1 clasificado", s == 200, str(f))
_, gd = llamar("GET", f"/grupos/{idG}", org2)
esperar("con fase: el grupo marca solo al primero", [p["clasificado"] for p in gd["posiciones"]] == [True, False], str(gd["posiciones"]))
_, t = llamar("GET", f"/campeonatos/{B}/estadisticas/posiciones", org2)
esperar("con fase: Reportes marca solo al primero", marcas(t) == [True, False], str(t)[:300])

print("\nRESUMEN", "TODO OK" if not fallas else f"{len(fallas)} fallas")
sys.exit(1 if fallas else 0)
