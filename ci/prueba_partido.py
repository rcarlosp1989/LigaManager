"""Prueba temporal: hora, estadio y árbitro del partido."""
import json, sys, urllib.request, urllib.error
BASE = "http://localhost:5080/api"
D = json.load(open(sys.argv[1]))
fallas = []
def llamar(m, ruta, tok=None, cuerpo=None):
    req = urllib.request.Request(BASE + ruta, data=json.dumps(cuerpo).encode() if cuerpo is not None else None, method=m, headers={"Content-Type": "application/json"})
    if tok: req.add_header("Authorization", "Bearer " + tok)
    try:
        with urllib.request.urlopen(req) as r: t = r.read().decode(); return r.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try: return e.code, json.loads(t)
        except Exception: return e.code, t
def esperar(nombre, cond, detalle=""):
    print(("OK   " if cond else "FALLA ") + nombre + (f" — {detalle}" if detalle and not cond else ""))
    if not cond: fallas.append(nombre)
tok = llamar("POST", "/auth/login", cuerpo={"email": "org1@prueba.ec", "password": "clave123"})[1]["token"]
pais = llamar("GET", "/catalogos/paises", tok)[1][0]["idPais"]
eqs = [e["idEquipo"] for e in llamar("GET", "/equipos", tok)[1]]

inst = llamar("GET", "/catalogos/instancias", tok)[1][0]["idInstancia"]
import random
def jornada_nueva():
    s, j = llamar("POST", f"/campeonatos/{D['campA']}/jornadas", tok, {"numero": random.randint(100, 9999), "idInstancia": inst, "idGrupo": None})
    return j["idJornada"]
jornada = jornada_nueva()
est = llamar("POST", "/estadios", tok, {"nombre": "Estadio Hora", "idPais": pais, "idCanton": None})[1]["idEstadio"]
arb = llamar("POST", "/arbitros", tok, {"nombre": "Juez", "apellido": "Hora", "cedula": "", "fechaNac": "1980-01-01", "idPais": pais, "idCanton": None})[1]["idArbitro"]
s, j = llamar("POST", f"/jornadas/{jornada}/partidos", tok, {"idEquipoLocal": eqs[0], "idEquipoVisitante": eqs[1], "fecha": "2026-11-20T15:30", "idEstadio": est, "idArbitro": arb})
esperar("crear partido con fecha y hora", s in (200, 201), f"{s} {str(j)[:200]}")
s, jd = llamar("GET", f"/jornadas/{jornada}", tok)
p = next((x for x in jd["partidos"] if x["fecha"].startswith("2026-11-20")), None)
esperar("el partido trae la hora", p and p["fecha"] == "2026-11-20 15:30", str(p and p["fecha"]))
esperar("el partido trae el estadio elegido (id)", p and p.get("idEstadio") == est, str(p and p.get("idEstadio")))
esperar("el partido trae el árbitro elegido (id)", p and p.get("idArbitro") == arb, str(p and p.get("idArbitro")))
s, r = llamar("PUT", f"/partidos/{p['idPartido']}", tok, {"idEquipoLocal": eqs[0], "idEquipoVisitante": eqs[1], "fecha": "2026-11-20T18:45", "idEstadio": est, "idArbitro": arb})
s2, d = llamar("GET", f"/partidos/{p['idPartido']}", tok)
esperar("editar la hora y releer", s == 200 and d["fecha"] == "2026-11-20 18:45" and d["idEstadio"] == est, f"{s} {str(d)[:160]}")
s, e = llamar("GET", f"/equipos/{eqs[0]}?fecha=2026-11-20", tok)
esperar("el plantel por fecha sigue funcionando", s == 200 and len(e["jugadores"]) > 0, f"{s}")
# Repetido: mismos equipos en la misma jornada
s, r = llamar("POST", f"/jornadas/{jornada}/partidos", tok, {"idEquipoLocal": eqs[0], "idEquipoVisitante": eqs[1], "fecha": "2026-11-21T10:00", "idEstadio": est, "idArbitro": arb})
esperar("crear el mismo partido otra vez → 400 con aviso claro", s == 400 and "ya está registrado" in str(r), f"{s} {r}")
s, r2 = llamar("POST", f"/jornadas/{jornada}/partidos", tok, {"idEquipoLocal": eqs[1], "idEquipoVisitante": eqs[0], "fecha": "2026-11-21T10:00", "idEstadio": est, "idArbitro": arb})
esperar("la vuelta (local y visitante invertidos) sí se puede", s in (200, 201), f"{s} {r2}")
s, jd = llamar("GET", f"/jornadas/{jornada}", tok)
vuelta = next(x for x in jd["partidos"] if x["idEquipoLocal"] == eqs[1])
s, r = llamar("PUT", f"/partidos/{vuelta['idPartido']}", tok, {"idEquipoLocal": eqs[0], "idEquipoVisitante": eqs[1], "fecha": "2026-11-21T10:00", "idEstadio": est, "idArbitro": arb})
esperar("editar un partido para que quede repetido → 400 con aviso", s == 400 and "ya está registrado" in str(r), f"{s} {r}")
print(f"RESUMEN {'TODO OK' if not fallas else str(len(fallas)) + ' FALLAS: ' + '; '.join(fallas)}")
sys.exit(1 if fallas else 0)
